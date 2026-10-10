const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRequest, parseDraft, describeHttpError, SCHEMA, MODEL, MAX_TEXT_LENGTH } = require('./ai.js');

const today = '2026-10-01';
const reply = (obj, extra = {}) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }], ...extra });
const good = { title: '과제', deadline: '2026-10-12', steps: [{ title: '자료 조사', load: 2, minutes: 60 }, { title: '작성', load: 5, minutes: 120 }] };

test('요청: 주소, 헤더 4개, 모델, 구조화 출력 형식', () => {
  const r = buildRequest({ text: '10/12까지 과제', today, apiKey: 'sk-test' });
  assert.equal(r.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(r.init.method, 'POST');
  assert.deepEqual(r.init.headers, {
    'x-api-key': 'sk-test',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',
  });
  const body = JSON.parse(r.init.body);
  assert.equal(body.model, 'claude-haiku-4-5');
  assert.equal(MODEL, 'claude-haiku-4-5');
  assert.deepEqual(body.messages, [{ role: 'user', content: '10/12까지 과제' }]);
  assert.deepEqual(body.output_config, { format: { type: 'json_schema', schema: SCHEMA } });
  assert.ok(body.max_tokens > 0);
  assert.ok(body.system.includes(today));
  assert.ok(!r.init.body.includes('sk-test')); // 키는 본문에 들어가지 않는다
  assert.ok(MAX_TEXT_LENGTH > 0);
});

test('스키마: 모든 객체가 additionalProperties false이고 required가 properties 전부', () => {
  const check = node => {
    if (node.type === 'object') {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort());
      Object.values(node.properties).forEach(check);
    }
    if (node.type === 'array') check(node.items);
  };
  check(SCHEMA);
  assert.ok(!JSON.stringify(SCHEMA).includes('minimum') && !JSON.stringify(SCHEMA).includes('maximum'));
});

test('정상 응답은 초안이 된다', () => {
  const r = parseDraft(reply(good), today);
  assert.equal(r.ok, true);
  assert.equal(r.draft.title, '과제');
  assert.equal(r.draft.deadline, '2026-10-12');
  assert.equal(r.draft.deadlineWarn, false);
  assert.deepEqual(r.draft.steps.map(s => [s.title, s.load, s.minutes, s.warn]), [['자료 조사', 2, 60, ''], ['작성', 5, 120, '']]);
});

test('마감: 비었거나 형식 오류, 오늘보다 이르면 비우고 표시. 오늘은 허용', () => {
  for (const d of ['', '내일', '2026-02-30', '2026-09-30']) {
    const r = parseDraft(reply({ ...good, deadline: d }), today);
    assert.equal(r.draft.deadline, '');
    assert.equal(r.draft.deadlineWarn, true);
  }
  const t = parseDraft(reply({ ...good, deadline: today }), today);
  assert.equal(t.draft.deadline, today);
  assert.equal(parseDraft(reply({ ...good, deadline: '2027-01-01' }), '2026-12-31').draft.deadline, '2027-01-01');
});

test('부하·시간: 범위 밖은 기본값으로 두고 표시, 시간은 30분 단위로 맞춘다', () => {
  const r = parseDraft(reply({ ...good, steps: [
    { title: 'a', load: 0, minutes: 60 }, { title: 'b', load: 6, minutes: 60 }, { title: 'c', load: 2.5, minutes: 60 },
    { title: 'd', load: 3, minutes: 0 }, { title: 'e', load: 3, minutes: -30 },
    { title: 'f', load: 3, minutes: 45 }, { title: 'g', load: 3, minutes: 10 }, { title: 'h', load: 1, minutes: 100 },
  ] }), today);
  const s = r.draft.steps;
  assert.deepEqual(s.slice(0, 3).map(x => [x.load, x.warn]), [[3, '부하를 확인하세요'], [3, '부하를 확인하세요'], [3, '부하를 확인하세요']]);
  assert.deepEqual(s.slice(3, 5).map(x => [x.minutes, x.warn]), [[60, '예상 시간을 확인하세요'], [60, '예상 시간을 확인하세요']]);
  assert.deepEqual(s.slice(5).map(x => x.minutes), [60, 30, 90]);
});

test('깨진 응답은 한국어 오류', () => {
  assert.equal(parseDraft(null, today).ok, false);
  assert.equal(parseDraft({}, today).ok, false);
  assert.equal(parseDraft({ content: [] }, today).ok, false);
  assert.match(parseDraft(reply('{깨짐'), today).error, /JSON/);
  assert.equal(parseDraft(reply([]), today).ok, false);
  assert.equal(parseDraft(reply({ title: 'x', deadline: '' }), today).ok, false);
  assert.match(parseDraft(reply({ ...good, steps: [] }), today).error, /단계/);
  assert.equal(parseDraft(reply({ ...good, steps: [{ load: 1, minutes: 60 }] }), today).ok, false);
  assert.match(parseDraft(reply(good, { stop_reason: 'refusal' }), today).error, /처리하지/);
  assert.match(parseDraft(reply(good, { stop_reason: 'max_tokens' }), today).error, /잘렸/);
});

test('HTTP 오류 안내', () => {
  assert.match(describeHttpError(401), /키/);
  assert.match(describeHttpError(429), /한도|많/);
  assert.match(describeHttpError(529), /서버/);
  assert.match(describeHttpError(418), /418/);
});

test('초안 검증: 공백 제목·너무 긴 시간·너무 많은 단계를 걸러 낸다', () => {
  const blank = parseDraft(reply({ ...good, steps: [{ title: '   ', load: 2, minutes: 60 }] }), today);
  assert.equal(blank.ok, true);
  assert.equal(blank.draft.steps[0].title, '');
  assert.match(blank.draft.steps[0].warn, /제목/);
  assert.equal(parseDraft(reply({ ...good, title: '  ' }), today).ok, false);
  const huge = parseDraft(reply({ ...good, steps: [{ title: 'a', load: 2, minutes: 1e9 }] }), today);
  assert.equal(huge.draft.steps[0].minutes, 60);
  assert.match(huge.draft.steps[0].warn, /예상 시간/);
  const many = Array.from({ length: 51 }, (_, i) => ({ title: `단계${i}`, load: 1, minutes: 30 }));
  assert.equal(parseDraft(reply({ ...good, steps: many }), today).ok, false);
});
