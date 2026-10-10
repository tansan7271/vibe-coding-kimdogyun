// RAD CARPET 데모 모드용 샘플 데이터 (모두 허구). 기준 오늘: 2026-10-10, 기간: 2026-09-01 ~ 2026-11-30
const DEMO_DATA = {
  "version": 1,
  "goals": [
    {
      "id": "goal_demo_01",
      "title": "알고리즘 과제 1",
      "deadline": "2026-09-18",
      "createdAt": "2026-09-07"
    },
    {
      "id": "goal_demo_02",
      "title": "데이터베이스 실습 보고서 1",
      "deadline": "2026-09-25",
      "createdAt": "2026-09-14"
    },
    {
      "id": "goal_demo_03",
      "title": "운영체제 과제 1",
      "deadline": "2026-10-02",
      "createdAt": "2026-09-21"
    },
    {
      "id": "goal_demo_04",
      "title": "소프트웨어공학 팀플 기획서",
      "deadline": "2026-10-07",
      "createdAt": "2026-09-28"
    },
    {
      "id": "goal_demo_05",
      "title": "네트워크 실험 보고서 3",
      "deadline": "2026-10-13",
      "createdAt": "2026-10-01"
    },
    {
      "id": "goal_demo_06",
      "title": "알고리즘 과제 3",
      "deadline": "2026-10-15",
      "createdAt": "2026-10-05"
    },
    {
      "id": "goal_demo_07",
      "title": "중간고사: 운영체제",
      "deadline": "2026-10-19",
      "createdAt": "2026-09-28"
    },
    {
      "id": "goal_demo_08",
      "title": "중간고사: 알고리즘",
      "deadline": "2026-10-20",
      "createdAt": "2026-09-28"
    },
    {
      "id": "goal_demo_09",
      "title": "중간고사: 데이터베이스",
      "deadline": "2026-10-21",
      "createdAt": "2026-09-28"
    },
    {
      "id": "goal_demo_10",
      "title": "소프트웨어공학 팀플 중간발표",
      "deadline": "2026-10-29",
      "createdAt": "2026-10-07"
    },
    {
      "id": "goal_demo_11",
      "title": "운영체제 과제 3",
      "deadline": "2026-11-06",
      "createdAt": "2026-10-10"
    },
    {
      "id": "goal_demo_12",
      "title": "교양 에세이",
      "deadline": "2026-11-13",
      "createdAt": "2026-10-10"
    },
    {
      "id": "goal_demo_13",
      "title": "데이터베이스 프로젝트 최종 제출",
      "deadline": "2026-11-20",
      "createdAt": "2026-10-10"
    },
    {
      "id": "goal_demo_14",
      "title": "팀플 최종 보고서",
      "deadline": "2026-11-27",
      "createdAt": "2026-10-10"
    }
  ],
  "steps": [
    {
      "id": "step_demo_01_1",
      "goalId": "goal_demo_01",
      "title": "문제 풀이",
      "load": 3,
      "minutes": 180,
      "order": 0,
      "done": true,
      "doneDate": "2026-09-12"
    },
    {
      "id": "step_demo_01_2",
      "goalId": "goal_demo_01",
      "title": "코드 작성",
      "load": 3,
      "minutes": 150,
      "order": 1,
      "done": true,
      "doneDate": "2026-09-15"
    },
    {
      "id": "step_demo_01_3",
      "goalId": "goal_demo_01",
      "title": "보고서 정리",
      "load": 2,
      "minutes": 60,
      "order": 2,
      "done": true,
      "doneDate": "2026-09-17"
    },
    {
      "id": "step_demo_02_1",
      "goalId": "goal_demo_02",
      "title": "실습 환경 구성",
      "load": 2,
      "minutes": 60,
      "order": 0,
      "done": true,
      "doneDate": "2026-09-17"
    },
    {
      "id": "step_demo_02_2",
      "goalId": "goal_demo_02",
      "title": "쿼리 실습",
      "load": 3,
      "minutes": 120,
      "order": 1,
      "done": true,
      "doneDate": "2026-09-21"
    },
    {
      "id": "step_demo_02_3",
      "goalId": "goal_demo_02",
      "title": "보고서 작성",
      "load": 3,
      "minutes": 120,
      "order": 2,
      "done": true,
      "doneDate": "2026-09-24"
    },
    {
      "id": "step_demo_03_1",
      "goalId": "goal_demo_03",
      "title": "스케줄러 설계",
      "load": 3,
      "minutes": 120,
      "order": 0,
      "done": true,
      "doneDate": "2026-09-26"
    },
    {
      "id": "step_demo_03_2",
      "goalId": "goal_demo_03",
      "title": "구현",
      "load": 4,
      "minutes": 240,
      "order": 1,
      "done": true,
      "doneDate": "2026-09-30"
    },
    {
      "id": "step_demo_03_3",
      "goalId": "goal_demo_03",
      "title": "테스트와 제출",
      "load": 2,
      "minutes": 90,
      "order": 2,
      "done": true,
      "doneDate": "2026-10-01"
    },
    {
      "id": "step_demo_04_1",
      "goalId": "goal_demo_04",
      "title": "아이디어 정리",
      "load": 2,
      "minutes": 60,
      "order": 0,
      "done": true,
      "doneDate": "2026-09-30"
    },
    {
      "id": "step_demo_04_2",
      "goalId": "goal_demo_04",
      "title": "요구사항 작성",
      "load": 3,
      "minutes": 120,
      "order": 1,
      "done": true,
      "doneDate": "2026-10-04"
    },
    {
      "id": "step_demo_04_3",
      "goalId": "goal_demo_04",
      "title": "발표 자료 다듬기",
      "load": 2,
      "minutes": 90,
      "order": 2,
      "done": true,
      "doneDate": "2026-10-06"
    },
    {
      "id": "step_demo_05_1",
      "goalId": "goal_demo_05",
      "title": "실험 데이터 정리",
      "load": 2,
      "minutes": 90,
      "order": 0,
      "done": true,
      "doneDate": "2026-10-07"
    },
    {
      "id": "step_demo_05_2",
      "goalId": "goal_demo_05",
      "title": "그래프 그리기",
      "load": 2,
      "minutes": 60,
      "order": 1,
      "done": true,
      "doneDate": "2026-10-09"
    },
    {
      "id": "step_demo_05_3",
      "goalId": "goal_demo_05",
      "title": "고찰 쓰기",
      "load": 4,
      "minutes": 120,
      "order": 2,
      "done": false,
      "pushCount": 1
    },
    {
      "id": "step_demo_05_4",
      "goalId": "goal_demo_05",
      "title": "최종 점검",
      "load": 2,
      "minutes": 30,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_06_1",
      "goalId": "goal_demo_06",
      "title": "문제 읽고 접근 정하기",
      "load": 2,
      "minutes": 60,
      "order": 0,
      "done": true,
      "doneDate": "2026-10-08"
    },
    {
      "id": "step_demo_06_2",
      "goalId": "goal_demo_06",
      "title": "동적계획법 구현",
      "load": 5,
      "minutes": 240,
      "order": 1,
      "done": false,
      "pushCount": 2
    },
    {
      "id": "step_demo_06_3",
      "goalId": "goal_demo_06",
      "title": "반례 테스트",
      "load": 4,
      "minutes": 120,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_06_4",
      "goalId": "goal_demo_06",
      "title": "보고서 정리",
      "load": 3,
      "minutes": 60,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_07_1",
      "goalId": "goal_demo_07",
      "title": "강의 요약 정리",
      "load": 3,
      "minutes": 180,
      "order": 0,
      "done": true,
      "doneDate": "2026-10-05"
    },
    {
      "id": "step_demo_07_2",
      "goalId": "goal_demo_07",
      "title": "기출 풀이",
      "load": 5,
      "minutes": 240,
      "order": 1,
      "done": false,
      "pushCount": 1
    },
    {
      "id": "step_demo_07_3",
      "goalId": "goal_demo_07",
      "title": "약한 단원 복습",
      "load": 5,
      "minutes": 180,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_07_4",
      "goalId": "goal_demo_07",
      "title": "마지막 훑기",
      "load": 3,
      "minutes": 60,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_08_1",
      "goalId": "goal_demo_08",
      "title": "개념 정리",
      "load": 3,
      "minutes": 150,
      "order": 0,
      "done": true,
      "doneDate": "2026-10-06"
    },
    {
      "id": "step_demo_08_2",
      "goalId": "goal_demo_08",
      "title": "기출 풀이",
      "load": 5,
      "minutes": 240,
      "order": 1,
      "done": false
    },
    {
      "id": "step_demo_08_3",
      "goalId": "goal_demo_08",
      "title": "증명 연습",
      "load": 5,
      "minutes": 180,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_08_4",
      "goalId": "goal_demo_08",
      "title": "마지막 훑기",
      "load": 3,
      "minutes": 60,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_09_1",
      "goalId": "goal_demo_09",
      "title": "정규화 정리",
      "load": 4,
      "minutes": 120,
      "order": 0,
      "done": false,
      "pushCount": 1
    },
    {
      "id": "step_demo_09_2",
      "goalId": "goal_demo_09",
      "title": "SQL 문제 풀이",
      "load": 5,
      "minutes": 240,
      "order": 1,
      "done": false
    },
    {
      "id": "step_demo_09_3",
      "goalId": "goal_demo_09",
      "title": "기출 풀이",
      "load": 5,
      "minutes": 180,
      "order": 2,
      "done": false,
      "pinnedDate": "2026-10-18"
    },
    {
      "id": "step_demo_10_1",
      "goalId": "goal_demo_10",
      "title": "역할 나누기",
      "load": 1,
      "minutes": 30,
      "order": 0,
      "done": true,
      "doneDate": "2026-10-09"
    },
    {
      "id": "step_demo_10_2",
      "goalId": "goal_demo_10",
      "title": "프로토타입 만들기",
      "load": 5,
      "minutes": 300,
      "order": 1,
      "done": false
    },
    {
      "id": "step_demo_10_3",
      "goalId": "goal_demo_10",
      "title": "발표 자료 만들기",
      "load": 4,
      "minutes": 150,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_10_4",
      "goalId": "goal_demo_10",
      "title": "발표 연습",
      "load": 3,
      "minutes": 60,
      "order": 3,
      "done": false,
      "pinnedDate": "2026-10-28"
    },
    {
      "id": "step_demo_11_1",
      "goalId": "goal_demo_11",
      "title": "문제 파악",
      "load": 3,
      "minutes": 60,
      "order": 0,
      "done": false
    },
    {
      "id": "step_demo_11_2",
      "goalId": "goal_demo_11",
      "title": "메모리 관리 구현",
      "load": 5,
      "minutes": 300,
      "order": 1,
      "done": false
    },
    {
      "id": "step_demo_11_3",
      "goalId": "goal_demo_11",
      "title": "테스트와 제출",
      "load": 3,
      "minutes": 90,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_12_1",
      "goalId": "goal_demo_12",
      "title": "주제 정하고 자료 찾기",
      "load": 3,
      "minutes": 120,
      "order": 0,
      "done": false
    },
    {
      "id": "step_demo_12_2",
      "goalId": "goal_demo_12",
      "title": "초안 쓰기",
      "load": 4,
      "minutes": 180,
      "order": 1,
      "done": false
    },
    {
      "id": "step_demo_12_3",
      "goalId": "goal_demo_12",
      "title": "고쳐 쓰고 제출",
      "load": 3,
      "minutes": 90,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_13_1",
      "goalId": "goal_demo_13",
      "title": "스키마 설계",
      "load": 4,
      "minutes": 150,
      "order": 0,
      "done": false
    },
    {
      "id": "step_demo_13_2",
      "goalId": "goal_demo_13",
      "title": "기능 구현",
      "load": 5,
      "minutes": 360,
      "order": 1,
      "done": false
    },
    {
      "id": "step_demo_13_3",
      "goalId": "goal_demo_13",
      "title": "성능 점검",
      "load": 4,
      "minutes": 120,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_13_4",
      "goalId": "goal_demo_13",
      "title": "보고서 작성",
      "load": 4,
      "minutes": 150,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_13_5",
      "goalId": "goal_demo_13",
      "title": "제출 확인",
      "load": 2,
      "minutes": 30,
      "order": 4,
      "done": false
    },
    {
      "id": "step_demo_14_1",
      "goalId": "goal_demo_14",
      "title": "자료 취합",
      "load": 3,
      "minutes": 90,
      "order": 0,
      "done": false
    },
    {
      "id": "step_demo_14_2",
      "goalId": "goal_demo_14",
      "title": "본문 작성",
      "load": 5,
      "minutes": 240,
      "order": 1,
      "done": false
    },
    {
      "id": "step_demo_14_3",
      "goalId": "goal_demo_14",
      "title": "검토와 제출",
      "load": 4,
      "minutes": 120,
      "order": 2,
      "done": false
    },
    {
      "id": "step_demo_05_5",
      "goalId": "goal_demo_05",
      "title": "참고문헌 정리",
      "load": 3,
      "minutes": 60,
      "order": 4,
      "done": false
    },
    {
      "id": "step_demo_06_5",
      "goalId": "goal_demo_06",
      "title": "추가 문제 풀이",
      "load": 4,
      "minutes": 120,
      "order": 4,
      "done": false
    },
    {
      "id": "step_demo_10_5",
      "goalId": "goal_demo_10",
      "title": "팀원 피드백 반영",
      "load": 3,
      "minutes": 90,
      "order": 4,
      "done": false
    },
    {
      "id": "step_demo_11_4",
      "goalId": "goal_demo_11",
      "title": "코드 리뷰 반영",
      "load": 3,
      "minutes": 120,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_12_4",
      "goalId": "goal_demo_12",
      "title": "참고문헌 정리",
      "load": 2,
      "minutes": 60,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_13_6",
      "goalId": "goal_demo_13",
      "title": "테스트 데이터 준비",
      "load": 3,
      "minutes": 90,
      "order": 5,
      "done": false
    },
    {
      "id": "step_demo_13_7",
      "goalId": "goal_demo_13",
      "title": "시연 영상 녹화",
      "load": 5,
      "minutes": 120,
      "order": 6,
      "done": false,
      "pinnedDate": "2026-11-20"
    },
    {
      "id": "step_demo_14_4",
      "goalId": "goal_demo_14",
      "title": "그림과 표 정리",
      "load": 3,
      "minutes": 90,
      "order": 3,
      "done": false
    },
    {
      "id": "step_demo_14_5",
      "goalId": "goal_demo_14",
      "title": "최종 발표 리허설",
      "load": 5,
      "minutes": 90,
      "order": 4,
      "done": false,
      "pinnedDate": "2026-11-27"
    }
  ],
  "events": [
    {
      "id": "event_demo_01",
      "title": "운영체제 강의",
      "start": "10:30",
      "end": "12:00",
      "load": 4,
      "repeat": "weekly",
      "weekday": 1,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-20"
      ]
    },
    {
      "id": "event_demo_02",
      "title": "운영체제 강의",
      "start": "10:30",
      "end": "12:00",
      "load": 4,
      "repeat": "weekly",
      "weekday": 3,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-09-24",
        "2026-10-22"
      ]
    },
    {
      "id": "event_demo_03",
      "title": "데이터베이스 강의",
      "start": "13:00",
      "end": "15:00",
      "load": 4,
      "repeat": "weekly",
      "weekday": 0,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-19"
      ]
    },
    {
      "id": "event_demo_04",
      "title": "데이터베이스 강의",
      "start": "13:00",
      "end": "14:30",
      "load": 4,
      "repeat": "weekly",
      "weekday": 2,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-21"
      ]
    },
    {
      "id": "event_demo_05",
      "title": "알고리즘 강의",
      "start": "13:30",
      "end": "15:00",
      "load": 4,
      "repeat": "weekly",
      "weekday": 1,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-20"
      ]
    },
    {
      "id": "event_demo_06",
      "title": "알고리즘 강의",
      "start": "13:30",
      "end": "15:00",
      "load": 4,
      "repeat": "weekly",
      "weekday": 3,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-09-24",
        "2026-10-22"
      ]
    },
    {
      "id": "event_demo_07",
      "title": "컴퓨터네트워크 강의",
      "start": "10:00",
      "end": "12:00",
      "load": 4,
      "repeat": "weekly",
      "weekday": 2,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-21"
      ]
    },
    {
      "id": "event_demo_08",
      "title": "네트워크 실험",
      "start": "15:00",
      "end": "18:00",
      "load": 5,
      "repeat": "weekly",
      "weekday": 2,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-21"
      ]
    },
    {
      "id": "event_demo_09",
      "title": "소프트웨어공학 강의",
      "start": "09:30",
      "end": "12:30",
      "load": 4,
      "repeat": "weekly",
      "weekday": 4,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-23"
      ]
    },
    {
      "id": "event_demo_10",
      "title": "교양: 현대미술의 이해",
      "start": "14:00",
      "end": "15:00",
      "load": 2,
      "repeat": "weekly",
      "weekday": 4,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-23"
      ]
    },
    {
      "id": "event_demo_11",
      "title": "교양: 심리학 입문",
      "start": "16:00",
      "end": "17:00",
      "load": 2,
      "repeat": "weekly",
      "weekday": 0,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-10-19"
      ]
    },
    {
      "id": "event_demo_12",
      "title": "조교 근로",
      "start": "17:30",
      "end": "19:00",
      "load": 3,
      "repeat": "weekly",
      "weekday": 0,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11"
    },
    {
      "id": "event_demo_13",
      "title": "스터디",
      "start": "19:00",
      "end": "21:00",
      "load": 4,
      "repeat": "weekly",
      "weekday": 1,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11"
    },
    {
      "id": "event_demo_14",
      "title": "동아리 합주",
      "start": "18:30",
      "end": "20:30",
      "load": 3,
      "repeat": "weekly",
      "weekday": 3,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11",
      "skipDates": [
        "2026-09-24"
      ]
    },
    {
      "id": "event_demo_15",
      "title": "편의점 알바",
      "start": "10:00",
      "end": "16:00",
      "load": 5,
      "repeat": "weekly",
      "weekday": 5,
      "date": "2026-09-01",
      "repeatUntil": "2026-12-11"
    },
    {
      "id": "event_demo_16",
      "title": "여름 계절학기: 영어회화",
      "start": "10:00",
      "end": "12:00",
      "load": 3,
      "repeat": "weekly",
      "weekday": 0,
      "date": "2026-07-06",
      "repeatUntil": "2026-08-28"
    },
    {
      "id": "event_demo_17",
      "title": "방학 인턴 보조",
      "start": "09:00",
      "end": "12:00",
      "load": 3,
      "repeat": "weekly",
      "weekday": 2,
      "date": "2026-07-01",
      "repeatUntil": "2026-08-28"
    },
    {
      "id": "event_demo_18",
      "title": "엑셀 단기특강",
      "start": "17:00",
      "end": "18:30",
      "load": 2,
      "repeat": "weekly",
      "weekday": 1,
      "date": "2026-09-01",
      "repeatUntil": "2026-09-22"
    },
    {
      "id": "event_demo_19",
      "title": "엑셀 단기특강",
      "start": "17:00",
      "end": "18:30",
      "load": 2,
      "repeat": "weekly",
      "weekday": 3,
      "date": "2026-09-01",
      "repeatUntil": "2026-09-17"
    },
    {
      "id": "event_demo_20",
      "title": "개강총회",
      "start": "18:30",
      "end": "21:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-09-03"
    },
    {
      "id": "event_demo_21",
      "title": "팀플 모임",
      "start": "14:00",
      "end": "16:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-09-12"
    },
    {
      "id": "event_demo_22",
      "title": "학과 MT",
      "start": "10:00",
      "end": "20:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-09-19"
    },
    {
      "id": "event_demo_23",
      "title": "동아리 정기 공연",
      "start": "15:00",
      "end": "18:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-09-26"
    },
    {
      "id": "event_demo_24",
      "title": "팀플 모임",
      "start": "14:00",
      "end": "17:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-10-03"
    },
    {
      "id": "event_demo_25",
      "title": "팀플 모임",
      "start": "19:00",
      "end": "21:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-10-14"
    },
    {
      "id": "event_demo_26",
      "title": "팀플 모임",
      "start": "13:00",
      "end": "16:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-10-17"
    },
    {
      "id": "event_demo_27",
      "title": "중간고사: 운영체제",
      "start": "10:30",
      "end": "12:00",
      "load": 5,
      "repeat": "none",
      "date": "2026-10-19"
    },
    {
      "id": "event_demo_28",
      "title": "중간고사: 알고리즘",
      "start": "13:30",
      "end": "15:30",
      "load": 5,
      "repeat": "none",
      "date": "2026-10-20"
    },
    {
      "id": "event_demo_29",
      "title": "중간고사: 데이터베이스",
      "start": "13:00",
      "end": "15:00",
      "load": 5,
      "repeat": "none",
      "date": "2026-10-21"
    },
    {
      "id": "event_demo_30",
      "title": "중간고사: 컴퓨터네트워크",
      "start": "10:00",
      "end": "12:00",
      "load": 5,
      "repeat": "none",
      "date": "2026-10-22"
    },
    {
      "id": "event_demo_31",
      "title": "중간고사: 소프트웨어공학",
      "start": "09:30",
      "end": "11:30",
      "load": 5,
      "repeat": "none",
      "date": "2026-10-23"
    },
    {
      "id": "event_demo_32",
      "title": "팀플 모임",
      "start": "14:00",
      "end": "17:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-10-24"
    },
    {
      "id": "event_demo_33",
      "title": "동아리 가을 공연",
      "start": "15:00",
      "end": "18:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-10-31"
    },
    {
      "id": "event_demo_34",
      "title": "취업 박람회",
      "start": "13:00",
      "end": "17:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-11-12"
    },
    {
      "id": "event_demo_35",
      "title": "팀플 모임",
      "start": "13:00",
      "end": "17:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-11-14"
    },
    {
      "id": "event_demo_36",
      "title": "팀플 모임",
      "start": "13:00",
      "end": "17:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-11-21"
    },
    {
      "id": "event_demo_37",
      "title": "학과 송년 모임 준비",
      "start": "14:00",
      "end": "17:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-11-28"
    },
    {
      "id": "event_demo_38",
      "title": "과제 질문 시간",
      "start": "20:00",
      "end": "21:00",
      "load": 2,
      "repeat": "none",
      "date": "2026-10-12"
    },
    {
      "id": "event_demo_39",
      "title": "중간고사 대비 스터디",
      "start": "10:00",
      "end": "12:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-10-17"
    },
    {
      "id": "event_demo_40",
      "title": "교수 면담",
      "start": "16:00",
      "end": "17:00",
      "load": 2,
      "repeat": "none",
      "date": "2026-10-21"
    },
    {
      "id": "event_demo_41",
      "title": "모의고사 스터디",
      "start": "19:00",
      "end": "21:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-10-22"
    },
    {
      "id": "event_demo_42",
      "title": "팀플 중간 점검 회의",
      "start": "18:00",
      "end": "20:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-10-28"
    },
    {
      "id": "event_demo_43",
      "title": "전공 세미나",
      "start": "10:00",
      "end": "11:30",
      "load": 2,
      "repeat": "none",
      "date": "2026-11-12"
    },
    {
      "id": "event_demo_44",
      "title": "프로젝트 시연 리허설",
      "start": "19:00",
      "end": "21:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-11-20"
    },
    {
      "id": "event_demo_45",
      "title": "기말 대비 스터디",
      "start": "19:00",
      "end": "21:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-11-26"
    },
    {
      "id": "event_demo_46",
      "title": "팀플 자료 점검",
      "start": "14:00",
      "end": "16:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-11-20"
    },
    {
      "id": "event_demo_47",
      "title": "팀플 자료 점검",
      "start": "14:00",
      "end": "16:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-11-27"
    },
    {
      "id": "event_demo_48",
      "title": "팀플 회의",
      "start": "19:00",
      "end": "21:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-11-04"
    },
    {
      "id": "event_demo_49",
      "title": "스터디 발표",
      "start": "19:00",
      "end": "21:00",
      "load": 3,
      "repeat": "none",
      "date": "2026-11-18"
    },
    {
      "id": "event_demo_50",
      "title": "팀플 최종 점검 회의",
      "start": "18:00",
      "end": "20:00",
      "load": 4,
      "repeat": "none",
      "date": "2026-11-27"
    }
  ],
  "settings": {
    "capacity": 15,
    "safeRatio": 0.8,
    "sleepHours": 8,
    "lifeHours": 4,
    "placeMode": "fill"
  }
};
if (typeof module === 'object' && module.exports) module.exports = DEMO_DATA;
