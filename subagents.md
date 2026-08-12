# Claude Code 서브에이전트

> **Claude Code의 특화된 에이전트를 위한 종합 가이드 - 목적에 맞는 AI 지원으로 생산성을 극대화하세요**

Claude Code는 특정 유형의 개발 작업을 처리하도록 설계된 강력한 특화 서브에이전트를 제공합니다. 각 서브에이전트는 특정 워크플로우에 최적화되어 있으며, 전문화된 도구와 지식 영역을 갖추고 있습니다.

## 📋 목차

- [개요](#overview)
- [사용 가능한 서브에이전트](#available-subagents)
- [빠른 참조](#quick-reference)
- [모범 사례](#best-practices)
- [통합 워크플로우](#integration-workflows)

## 개요

Claude Code의 서브에이전트는 소프트웨어 개발의 다양한 영역에 특화된 전문성을 제공합니다. 모든 작업에 범용 에이전트를 사용하는 대신, 특정 용도에 맞춰진 이 에이전트들을 활용하면 더 좋은 결과를 얻을 수 있습니다.

### 주요 이점

- **전문 지식**: 각 에이전트는 도메인별 전문성을 갖추고 있습니다
- **최적화된 도구**: 에이전트는 자신의 전문 분야와 가장 관련성 높은 도구에 접근합니다
- **더 나은 컨텍스트**: 특화된 에이전트는 해당 도메인과 관련된 컨텍스트를 더 잘 유지합니다
- **빠른 결과**: 특화된 에이전트는 자신의 영역에서 더 효율적으로 작업할 수 있습니다

## 사용 가능한 서브에이전트

### 개발 전문가

#### [프론트엔드 개발자](subagents/frontend-developer.md)
프론트엔드 컴포넌트, UI 요소, 스타일링, 사용자 인터페이스 로직을 구축, 수정, 디버깅하는 데 특화되어 있습니다.

#### [백엔드 개발자](subagents/backend-developer.md)
서버 사이드 개발, API, 데이터베이스, 시스템 아키텍처 전문가입니다.

#### [API 개발자](subagents/api-developer.md)
API 설계, 구현, 문서화, 통합에 집중하는 에이전트입니다.

#### [모바일 개발자](subagents/mobile-developer.md)
iOS 및 Android 플랫폼용 모바일 애플리케이션 개발에 특화되어 있습니다.

### 언어 전문가

#### [Python 개발자](subagents/python-developer.md)
Python 개발, 프레임워크, 생태계 도구 전문가입니다.

#### [JavaScript 개발자](subagents/javascript-developer.md)
JavaScript 개발, Node.js, 브라우저 기반 애플리케이션에 특화되어 있습니다.

#### [TypeScript 개발자](subagents/typescript-developer.md)
TypeScript 개발, 타입 시스템, 최신 JavaScript 패턴 전문가입니다.

#### [PHP 개발자](subagents/php-developer.md)
PHP 개발, 프레임워크, 웹 애플리케이션 개발에 특화되어 있습니다.

#### [WordPress 개발자](subagents/wordpress-developer.md)
WordPress 개발, 테마, 플러그인, 커스터마이징 전문가입니다.

#### [iOS 개발자](subagents/ios-developer.md)
Swift와 Objective-C를 이용한 iOS 애플리케이션 개발에 특화되어 있습니다.

### 데이터베이스 & 아키텍처

#### [데이터베이스 설계자](subagents/database-designer.md)
데이터베이스 설계, 최적화, 데이터 모델링 전문가입니다.

### 코드 품질 & 유지보수

#### [코드 리뷰어](subagents/code-reviewer.md)
코드 리뷰, 품질 평가, 모범 사례 적용에 특화되어 있습니다.

#### [코드 디버거](subagents/code-debugger.md)
디버깅, 문제 해결, 트러블슈팅 전문가입니다.

#### [코드 문서화 담당](subagents/code-documenter.md)
코드베이스에 대한 종합적인 문서 작성에 특화되어 있습니다.

#### [코드 리팩터](subagents/code-refactor.md)
코드 리팩터링, 최적화, 재구성 전문가입니다.

#### [코드 보안 감사자](subagents/code-security-auditor.md)
보안 분석, 취약점 평가, 안전한 코딩 관행에 특화되어 있습니다.

#### [코드 표준 준수 담당](subagents/code-standards-enforcer.md)
코딩 표준, 스타일 가이드, 코드 일관성 적용 전문가입니다.

## 빠른 참조

### 상황별 서브에이전트 선택

| 작업 유형 | 추천 서브에이전트 | 사용 예시 |
|-----------|---------------------|------------------|
| UI 컴포넌트 구축 | Frontend UI Expert | "반응형 내비게이션 바를 만들어줘" |
| 코드 품질 리뷰 | Production Validator | "이 코드를 프로덕션 배포 관점에서 검토해줘" |
| 문서 작성 | Code Documentor | "이 인증 모듈을 문서화해줘" |
| 복잡한 리서치 | General Purpose | "이 코드베이스의 모든 API 엔드포인트를 찾아줘" |
| 다단계 자동화 | General Purpose | "테스트가 포함된 CI/CD 파이프라인을 구축해줘" |

### 서브에이전트 호출 패턴

```bash
# Task 도구로 서브에이전트 호출하기
/task description="Build user profile component" subagent_type="frontend-ui-expert"
/task description="Review code quality" subagent_type="production-validator"
/task description="Create API docs" subagent_type="code-documentor"
/task description="Research database schema" subagent_type="general-purpose"
```

## 모범 사례

### 올바른 서브에이전트 선택하기

1. **작업과 전문성 일치시키기**: 작업 내용과 전문 분야가 맞는 서브에이전트를 선택하세요
2. **도구 요구사항 고려하기**: 일부 서브에이전트는 설계상 도구 접근이 제한되어 있습니다
3. **컨텍스트를 고려하기**: 특화된 에이전트는 더 집중된 컨텍스트를 유지합니다
4. **복잡한 작업에는 범용 에이전트 사용하기**: 작업이 여러 도메인에 걸쳐 있다면 범용(general-purpose) 에이전트를 사용하세요

### 효과적인 서브에이전트 사용법

1. **구체적으로 요청하기**: 명확하고 상세한 작업 설명을 제공하세요
2. **기대치를 명확히 하기**: 서브에이전트가 무엇을 제공해야 하는지 구체적으로 지정하세요
3. **컨텍스트 제공하기**: 관련된 배경 정보를 포함하세요
4. **서브에이전트를 연쇄적으로 사용하기**: 복잡한 워크플로우에는 여러 서브에이전트를 순서대로 활용하세요

### 공통 패턴

```bash
# 프론트엔드 개발 워크플로우
1. Frontend UI Expert: 컴포넌트 구축
2. Production Validator: 프로덕션 관점에서 검토
3. Code Documentor: 컴포넌트 문서 작성

# 코드 리뷰 워크플로우
1. Production Validator: 1차 품질 점검
2. General Purpose: 필요 시 복잡한 분석 수행
3. Code Documentor: 문서 업데이트

# 리서치 및 구현
1. General Purpose: 리서치 및 계획 수립
2. Specialized Agent: 구현
3. Production Validator: 최종 검토
```

## 통합 워크플로우

### 멀티 에이전트 워크플로우

Claude Code에서는 복잡한 워크플로우를 위해 서브에이전트를 연쇄적으로 연결할 수 있습니다:

1. **순차 처리**: 에이전트를 하나씩 차례로 사용
2. **병렬 처리**: 여러 에이전트를 동시에 실행
3. **조건부 로직**: 작업 요구사항에 따라 에이전트 선택

### 워크플로우 예시

#### 완전한 기능 개발
```
1. General Purpose: 요구사항 리서치 및 아키텍처 설계
2. Frontend UI Expert: 사용자 인터페이스 컴포넌트 구축
3. Production Validator: 코드 품질 및 보안 검토
4. Code Documentor: 종합적인 문서 작성
```

#### 코드 품질 파이프라인
```
1. Production Validator: 자동화된 품질 점검
2. General Purpose: 필요 시 복잡한 이슈 분석
3. Frontend UI Expert: UI 관련 수정 (해당하는 경우)
4. Code Documentor: 문서 업데이트
```

## 시작하기

1. **작업 유형 파악하기**: 어떤 서브에이전트가 가장 적합한지 판단하세요
2. **Task 도구 사용하기**: Claude Code의 Task 도구로 서브에이전트를 호출하세요
3. **명확한 지시 제공하기**: 무엇을 원하는지 구체적으로 알려주세요
4. **결과 검토하기**: 각 서브에이전트는 집중된 응답을 제공합니다
5. **필요에 따라 연쇄 사용하기**: 복잡한 워크플로우에는 여러 서브에이전트를 사용하세요

## 고급 사용법

### 커스텀 서브에이전트 패턴

서브에이전트를 Claude Code의 다른 기능들과 결합해 정교한 워크플로우를 만들 수 있습니다:

- **세션 관리**: 서브에이전트 호출 간 컨텍스트 유지
- **도구 권한**: 보안을 위한 특정 도구 접근 설정
- **출력 형식**: 자동화를 위한 구조화된 출력 사용
- **오류 처리**: 서브에이전트 간 대체(fallback) 패턴 구현

### 성능 최적화

- 컨텍스트 전환을 줄이기 위해 특화된 서브에이전트를 사용하세요
- 가능하다면 서브에이전트 병렬 실행을 활용하세요
- 반복 작업의 경우 공통 서브에이전트 결과를 캐싱하세요
- Claude Code의 비용 추적 기능으로 서브에이전트 성능을 모니터링하세요

---

각 서브에이전트에 대한 자세한 내용은 `subagents/` 디렉토리 안의 개별 문서를 참고하세요.
