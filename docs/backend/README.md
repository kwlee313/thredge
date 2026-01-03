# Backend 구조 요약

## 레이어 개요
- api: Controller + 요청/응답 DTO
- service: 비즈니스 로직, 트랜잭션 경계
- domain: entity/repository
- support: 공통 유틸/예외/검증

## 요청 흐름
- Controller에서 인증/검증 수행 후 Service 호출
- Service가 repository를 호출하고 mapper를 통해 DTO로 변환
- 공통 예외는 `support/GlobalExceptionHandler`에서 표준 응답으로 처리

## DTO 규칙
- api/dto에 요청/응답 정의
- 목록 응답은 `PageResponse<T>` 사용
- 입력 검증은 Bean Validation 애노테이션으로 일관 처리
  - 페이징은 `page/size`와 `hasNext` 기반으로 처리

## 매퍼
- Thread/Category 매핑은 `api/mapper`에 위치
- 동일 구조의 변환 로직은 매퍼에서 재사용
