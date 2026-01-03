# thredge

하나의 아이디어를 하나의 스레드로 만들고, 댓글을 시간 순서로 쌓아가며
사고를 발전시키는 완전 개인용(thread-first) 사고 로그 앱입니다.
Notion 같은 거대 올인원 툴을 지양하고, UI/기능을 최소화해
생각의 시간성, 당시의 완성된 문장, 맥락(context) 보존에 집중합니다.

## 문서
- 작업 계획: `docs/archive/1.THREDGE_IMPLEMENTATION_PLAN.md`
- 기술 스택: `docs/archive/2.THREDGE_TECH_STACK.md`
- 로컬 개발: `docs/DEV.md`
- OpenAPI: `docs/OPENAPI.md`

## 로컬 실행(요약)
- 실행: `docker compose up --build`
- Frontend: `http://localhost:5174`
- Backend: `http://localhost:28080/api/health`
