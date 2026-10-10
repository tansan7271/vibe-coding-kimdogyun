// 카펫 박스 목록이 바뀌었는지, 어느 박스를 다시 떨어뜨려야 하는지 가리는 계산. 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
//
// 박스 하나는 { id, col, load, kind, title, goal, minutes, push } 모양이다(app-carpet-next.js의 boxItems).
// 떨어뜨리는 박스: 새로 생겼거나, 다른 날(col)로 옮겨졌거나, 크기(load)가 바뀐 것. 그 밖의 글자·시간만 바뀐 박스는 제자리에서 내용만 바뀐다(edited).
// 없어진 박스(removed)는 사라지는 연출을 받는다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BoxDiff = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // 이전 목록(prev)과 새 목록(next)을 견준다.
  // changed: 하나라도 달라졌는가(없어진 것, 새것, 내용이 바뀐 것 포함).  drop: 다시 떨어뜨릴 박스의 id(next의 순서대로)
  // removed: next에 없는 박스의 id(prev의 순서대로).  edited: 같은 자리·크기인데 글자·시간 같은 내용만 바뀐 박스의 id
  function diffBoxes(prev, next) {
    const before = new Map(prev.map(it => [it.id, it]));
    const drop = [], edited = [];
    const nextIds = new Set(next.map(it => it.id));
    const removed = prev.filter(it => !nextIds.has(it.id)).map(it => it.id);
    let changed = prev.length !== next.length || removed.length > 0;
    for (const it of next) {
      const old = before.get(it.id);
      if (!old) { drop.push(it.id); changed = true; continue; }
      if (old.col !== it.col || old.load !== it.load) { drop.push(it.id); changed = true; continue; }
      for (const key of new Set([...Object.keys(old), ...Object.keys(it)])) {
        if (key !== 'at' && old[key] !== it[key]) { changed = true; edited.push(it.id); break; } // at: 떨어뜨리는 시각(화면 쪽이 붙이는 값)은 비교하지 않는다
      }
    }
    return { changed, drop, removed, edited };
  }

  return { diffBoxes };
});
