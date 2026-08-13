# Claude Code 치트시트 (베타)

![Alt text](images/claude-code-cheat-sheet.png)

> **몇 분 만에 초보자에서 고수까지, Claude Code를 완벽하게 마스터하는 가이드!**

Claude Code를 광범위하게 테스트하면서 정리한 종합 치트시트입니다. 시간 낭비 없이 기초부터 고급 기능까지 빠르게 익힐 수 있도록 구성했습니다. Claude Code를 처음 접하는 분이든, 고급 기능까지 마스터하고 싶은 분이든 이 가이드 하나로 충분합니다.

## 빠른 시작

Claude Code를 설치하고 로그인한 뒤, 작업할 프로젝트의 루트 디렉토리에서 실행하세요.

### macOS, Linux, WSL

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude auth login
claude
```

### Windows PowerShell

```powershell
irm https://claude.ai/install.ps1 | iex
claude auth login
claude
```

### Windows CMD

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
claude auth login
claude
```

### 패키지 매니저

```bash
# macOS
brew install --cask claude-code
```

```powershell
# Windows
winget install Anthropic.ClaudeCode
```

설치 확인:

```bash
claude --version
claude auth status
```

## 📚 목차

- 🟢 **레벨 1: 기본 명령어**
- 🟡 **레벨 2: 중급 명령어**
- 🟠 **레벨 3: 고급 명령어**
- 🔴 **레벨 4: 전문가 명령어**
- 🔵 **레벨 5: 파워 유저 명령어**
- 🟣 **레벨 6: 마스터 명령어**
- 🤝 **기여하기**
- 📄 **라이선스**

### 하위 문서

- 🤖 **[서브에이전트](subagents.md)** - 특정 개발 작업에 특화된 AI 에이전트

---

## 🟢 레벨 1: 기본 명령어

시작하는 데 필요한 필수 명령어

### 설치 및 시작하기

Claude Code를 사용하려면 Claude Code 이용 권한이 있는 계정이 필요합니다. 설치 후 `claude auth login`으로 로그인하거나, `claude`를 실행하고 브라우저 안내를 따르세요.

#### 네이티브 설치

```bash
# macOS, Linux, WSL에 권장되는 네이티브 설치 방법
curl -fsSL https://claude.ai/install.sh | bash
```

```powershell
# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

```cmd
# Windows CMD
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

#### 패키지 매니저

```bash
# macOS Homebrew
brew install --cask claude-code
```

```powershell
# Windows WinGet
winget install Anthropic.ClaudeCode
```

#### npm

```bash
# 더 이상 권장되지 않는 npm 설치 방식 (레거시)
npm install -g @anthropic-ai/claude-code
```

#### 인증

```bash
# 로그인
claude auth login

# 로그인 상태 확인
claude auth status

# 로그아웃
claude auth logout
```

#### 첫 실행 및 업데이트

```bash
# 대화형 REPL 시작
claude

# 초기 프롬프트와 함께 시작
claude "이 프로젝트를 요약해줘"

# 버전 확인
claude --version

# 최신 버전으로 업데이트
claude update

# 특정 네이티브 버전 설치/재설치
claude install stable
claude install latest
claude install 2.1.118
```

### 기본 탐색

```bash
/help                     # 도움말 및 사용 가능한 명령어 표시
/exit                     # REPL 종료
/clear [name]             # 새 대화 시작 (이전 세션은 나중에 다시 이어갈 수 있음)
/compact [instructions]   # 컨텍스트 확보를 위해 현재 대화 내역 요약
/context                  # 컨텍스트 사용량 시각화
/config                   # 설정 패널 열기
/status                   # 버전, 모델, 계정, 연결 상태 표시
/doctor                   # Claude Code 설치 상태 점검
```

### 기본 파일 작업 및 프린트 모드

```bash
# 프린트 모드 - 프롬프트 실행 후 종료
claude -p "이 함수를 설명해줘"

# 파이프로 전달된 콘텐츠 처리
cat logs.txt | claude -p "설명해줘"

# 가장 최근 대화 이어가기
claude -c

# 프린트 모드로 이어가기
claude -c -p "타입 오류를 확인해줘"
```

### 세션 관리

```bash
# 현재 디렉토리의 가장 최근 세션 이어가기
claude --continue

# 세션 ID 또는 이름으로 재개
claude --resume abc123 "query"
claude --resume auth-refactor

# 세션 선택 화면 열기
claude --resume

# 시작 시 세션 이름 지정
claude -n auth-refactor

# 진행 중인 세션 이름 변경
/rename auth-refactor

# 현재 대화를 분기(branch)
/branch try-streaming-approach

# PR과 연결된 세션 재개
claude --from-pr 123
```

### 키보드 단축키

```bash
Ctrl+C                    # 중단; 입력이 비어있으면 입력을 지우고, 한 번 더 누르면 종료
Ctrl+D                    # Claude Code 종료
Ctrl+O                    # 트랜스크립트 뷰어 켜기/끄기
Ctrl+R                    # 명령어 히스토리 역방향 검색
Ctrl+T                    # 작업(task) 목록 켜기/끄기
Esc                       # 현재 응답 또는 도구 호출 중단
Esc Esc                   # 입력 초안 지우기 (입력이 비어있으면 되돌리기(rewind) 메뉴 열기)
Shift+Tab                 # 권한 모드 전환
Alt+P / Option+P          # 모델 전환
Alt+T / Option+T          # 확장 사고(extended thinking) 켜기/끄기
Alt+O / Option+O          # 패스트 모드 켜기/끄기
@                         # 파일 경로 언급 자동완성
!                         # 셸 모드
Up/Down                   # 여러 줄 입력 내 이동 또는 명령어 히스토리 탐색
```

## 🟡 레벨 2: 중급 명령어

설정, 모델, 세션 관리

### 모델 설정

```bash
# 모델 전환
claude --model sonnet                    # Sonnet 모델 사용
claude --model opus                      # Opus 모델 사용
claude --model claude-sonnet-4-6         # 특정 모델 지정

# 세션의 추론 강도(reasoning effort) 설정
claude --effort high
/effort high

# 세션 내에서 모델 변경
/model sonnet
```

### 디렉토리 관리

```bash
# 추가 작업 디렉토리 등록
claude --add-dir ../apps ../lib

# 디렉토리 경로 유효성 확인
claude --add-dir /path/to/project
```

### 출력 형식

```bash
# 프린트 모드 출력 형식
claude -p "query" --output-format json
claude -p "query" --output-format text
claude -p "query" --output-format stream-json

# 프린트 모드 입력 형식
claude -p --input-format stream-json
```

### 세션 제어

```bash
# 프린트 모드에서 에이전트 턴 수 제한
claude -p --max-turns 3 "query"

# 상세 로그 출력
claude --verbose

# 세션 비용, 한도, 활동 통계
/usage
/cost                     # /usage의 별칭
/stats                    # /usage의 별칭
```

## 🟠 레벨 3: 고급 명령어

도구 및 권한 관리

### 도구 관리

```bash
# 특정 도구를 확인 없이 허용
claude --allowedTools "Bash(git log:*)" "Bash(git diff:*)" "Write"

# 특정 도구 사용 금지
claude --disallowedTools "Bash(rm:*)" "Bash(sudo:*)"

# 특정 도구 권한 확인 요청
claude -p --permission-prompt-tool mcp_auth_tool "query"

# 모든 권한 확인 생략 (위험)
claude --dangerously-skip-permissions
```

### 슬래시 명령어 - 세션 관리

```bash
/compact [instructions]   # 선택적 지시사항과 함께 대화 요약
/clear                    # 대화 기록 및 컨텍스트 초기화
/exit                     # REPL 종료
/help                     # 사용 가능한 명령어 표시
/config                   # 설정 패널 열기
```

### 슬래시 명령어 - 시스템

```bash
/doctor                   # 설치 상태 점검
/usage                    # 세션 비용, 한도, 활동 통계 표시
/ide                      # IDE 연동 관리
```

## 🔴 레벨 4: 전문가 명령어

MCP 및 고급 연동

### 모델 컨텍스트 프로토콜 (MCP)

```bash
# MCP 서버 설정
claude --mcp

# MCP 서버 관리 (슬래시 명령어)
/mcp                      # MCP 기능 접근
```

### 고급 파이프라인

```bash
# 복합 파이프 작업
git log --oneline | claude -p "이 커밋들을 요약해줘"
cat error.log | claude -p "근본 원인을 찾아줘"
ls -la | claude -p "이 디렉토리 구조를 설명해줘"
```

### 프로그래밍 방식 사용

```bash
# 스크립팅용 JSON 출력
claude -p "코드 분석" --output-format json

# 실시간 처리를 위한 스트림 JSON
claude -p "large task" --output-format stream-json

# 배치 처리
claude -p --max-turns 1 "quick query"
```

## 🔵 레벨 5: 파워 유저 명령어

고급 워크플로우와 자동화

### 커스텀 슬래시 명령어

```bash
# .claude/commands/ 안에 커스텀 명령어 생성
# 예: .claude/commands/debug.md
/debug                    # 커스텀 debug 명령어 실행
/test                     # 커스텀 test 명령어 실행
/deploy                   # 커스텀 deploy 명령어 실행
```

### 복합 도구 조합

```bash
# 고급 도구 권한 조합
claude --allowedTools "Bash(git:*)" "Write" "Read" \
       --disallowedTools "Bash(rm:*)" "Bash(sudo:*)"

# 여러 디렉토리 접근
claude --add-dir ../frontend ../backend ../shared
```

### 성능 최적화

```bash
# 성능을 위한 컨텍스트 제한
claude -p --max-turns 5 "focused query"

# 자주 컨텍스트 비우기
/clear                    # 작업 간 전환 시 성능 향상을 위해 사용

# 대화 압축
/compact "keep only important parts"
```

## 🟣 레벨 6: 마스터 명령어

전문가용 자동화 및 커스텀 워크플로우

### 고급 설정

```bash
# 복합 모델 및 도구 설정
claude --model claude-sonnet-4-6 \
       --add-dir ../apps ../lib ../tools \
       --allowedTools "Bash(git:*)" "Write" "Read" \
       --verbose \
       --output-format json
```

### 자동화 스크립트

```bash
# 스크립트로 Claude와 상호작용
#!/bin/bash
claude -p "analyze codebase" --output-format json > analysis.json
claude -p "generate tests" --max-turns 3 --output-format text > tests.txt
```

### 고급 세션 관리

```bash
# 세션 ID 관리
SESSION_ID=$(claude -p "start analysis" --output-format json | jq -r '.session_id')
claude -r "$SESSION_ID" "continue analysis"
```

### 복합 워크플로우

```bash
# 다단계 자동화
claude -p "analyze project structure" | \
claude -p "suggest improvements" | \
claude -p "create implementation plan"
```

---

## 🟤 레벨 7: 워크플로우 자동화

고급 자동화 패턴과 다단계 프로세스

### 자동화된 코드 리뷰 워크플로우

```bash
# 자동화된 PR 리뷰 프로세스
#!/bin/bash
git diff HEAD~1 | claude -p "review this PR for security issues" > security_review.md
git diff HEAD~1 | claude -p "check for performance issues" > performance_review.md
git diff HEAD~1 | claude -p "suggest improvements" > improvements.md
```

### CI 연동

```bash
# CI/CD 파이프라인 연동
claude -p "analyze test coverage" --output-format json | jq '.coverage_percentage'
claude -p "generate release notes from commits" --max-turns 2 > RELEASE_NOTES.md
```

### 배치 처리 워크플로우

```bash
# 여러 파일 처리
find . -name "*.js" -exec claude -p "analyze this file for bugs: {}" \; > bug_report.txt

# 자동 문서 생성
for file in src/*.py; do
    claude -p "generate docstring for $file" --output-format text >> docs.md
done
```

---

## ⚫ 레벨 8: 통합 및 생태계

IDE 연동, Git 워크플로우, 서드파티 도구 연결

### IDE 연동 명령어

```bash
# VS Code 연동
/ide vscode                # VS Code 연동 설정
/ide configure             # IDE 설정 구성

# 커스텀 IDE 명령어
claude --ide-mode "explain selected code"
claude --ide-mode "refactor this function"
```

### Git 워크플로우 연동

```bash
# Git 훅 연동
claude -p "create pre-commit hook for code quality" > .git/hooks/pre-commit

# 고급 Git 작업
git log --oneline -10 | claude -p "create changelog from these commits"
git diff --name-only | claude -p "explain what changed in this commit"
```

### 서드파티 도구 연결

```bash
# 데이터베이스 연동
mysql -e "SHOW TABLES" | claude -p "analyze database structure"

# Docker 연동
docker ps | claude -p "analyze running containers"
docker logs container_name | claude -p "find errors in logs"
```

---

## ⚪ 레벨 9: 성능 및 최적화

고급 성능 튜닝, 리소스 관리, 효율화 팁

### 메모리 및 리소스 관리

```bash
# 메모리 사용 최적화
claude -p --max-turns 1 "quick analysis"      # 효율을 위한 단일 턴
claude -p --compact-mode "analyze with minimal context"

# 리소스 모니터링
/usage                     # 현재 세션 비용, 한도, 활동 통계 확인
/doctor --performance      # 성능 진단
```

### 캐싱 및 최적화

```bash
# 효율적인 세션 재사용
claude -c -p "continue previous analysis"      # 프린트 모드에서 기존 컨텍스트 재사용
claude --cache-results "repetitive task"      # 반복 작업 캐싱

# 병렬 처리
claude -p "task 1" & claude -p "task 2" & wait  # 병렬 실행
```

### 대규모 처리

```bash
# 대규모 코드베이스 효율적으로 처리
claude --add-dir . --max-context 50000 "analyze entire project"
claude --stream-output "process large dataset" | head -100
```

---

## 🔘 레벨 10: 엔터프라이즈 및 프로덕션

프로덕션 환경 설정, 팀 워크플로우, 엔터프라이즈 기능

### 팀 협업

```bash
# 팀 공유 설정
claude --config-file team-config.json "standardized analysis"

# 팀 세션 공유
claude -r "team-session-id" "continue team discussion"
```

### 프로덕션 환경 설정

```bash
# 프로덕션용 설정
claude --production-mode \
       --security-enabled \
       --audit-logging \
       --max-turns 10 \
       "production analysis"
```

### 엔터프라이즈 보안

```bash
# 보안 중심 작업
claude --disallowedTools "Bash(rm:*)" "Bash(sudo:*)" "Bash(chmod:*)" \
       --audit-mode \
       --no-external-calls \
       "secure code review"
```

### 모니터링 및 컴플라이언스

```bash
# 감사 및 컴플라이언스
claude --audit-log /var/log/claude-audit.log "compliance check"
claude --compliance-mode "analyze for security compliance"
```

## 명령어 참조표

### CLI 명령어

| 명령어 | 설명 | 예시 |
|---------|-------------|---------|
| `claude` | 대화형 REPL 시작 | `claude` |
| `claude "query"` | 프롬프트와 함께 REPL 시작 | `claude "explain this project"` |
| `claude -p "query"` | 프린트 모드: 프롬프트 실행 후 종료 | `claude -p "explain function"` |
| `cat file \| claude -p "query"` | 파이프로 전달된 콘텐츠 처리 | `cat logs.txt \| claude -p "explain"` |
| `claude -c` / `claude --continue` | 현재 디렉토리의 가장 최근 대화 이어가기 | `claude --continue` |
| `claude -r "<session>"` / `claude --resume <session>` | 세션 ID 또는 이름으로 재개 | `claude --resume auth-refactor` |
| `claude --resume` | 세션 선택 화면 열기 | `claude --resume` |
| `claude -n <name>` | 시작 시 세션 이름 지정 | `claude -n auth-refactor` |
| `claude --from-pr <PR>` | PR과 연결된 세션 재개 | `claude --from-pr 123` |
| `claude auth login` | Claude Code 로그인 | `claude auth login` |
| `claude auth status` | 인증 상태 확인 | `claude auth status` |
| `claude auth logout` | 로그아웃 | `claude auth logout` |
| `claude update` | 최신 버전으로 업데이트 | `claude update` |
| `claude install [version]` | 네이티브 바이너리 설치/재설치 | `claude install stable` |
| `claude mcp` | MCP 서버 설정 | `claude mcp` |

### CLI 플래그

| 플래그 | 설명 | 예시 |
|------|-------------|---------|
| `--model` | 이 세션에서 사용할 모델 지정 | `--model sonnet` |
| `--effort` | 이 세션의 추론 강도 설정 | `--effort high` |
| `--add-dir` | 파일 접근을 위한 작업 디렉토리 추가 | `--add-dir ../apps ../lib` |
| `--allowedTools` | 확인 없이 도구 허용 | `--allowedTools "Bash(git:*)"` |
| `--disallowedTools` | 특정 도구 금지 | `--disallowedTools "Bash(rm:*)"` |
| `--output-format` | 출력 형식 지정 | `--output-format json` |
| `--input-format` | 입력 형식 지정 | `--input-format stream-json` |
| `--max-turns` | 프린트 모드에서 에이전트 턴 수 제한 | `--max-turns 3` |
| `--verbose` | 상세 로그 활성화 | `--verbose` |
| `--continue` | 세션 이어가기 | `--continue` |
| `--resume` | 세션 재개 | `--resume abc123` |
| `--from-pr` | PR과 연결된 세션 재개 | `--from-pr 123` |
| `--fork-session` | 세션을 복사해 분기 후 재개 | `--continue --fork-session` |
| `--dangerously-skip-permissions` | 모든 권한 확인 생략 | `--dangerously-skip-permissions` |

### 슬래시 명령어

| 명령어 | 설명 |
|---------|-------------|
| `/help` | 도움말 및 사용 가능한 명령어 표시 |
| `/exit` | CLI 종료; 백그라운드 세션에 붙어 있는 경우 분리(detach) |
| `/clear [name]` | 새 대화 시작 (이전 세션은 나중에 재개 가능) |
| `/compact [instructions]` | 컨텍스트 확보를 위해 현재 대화 요약 |
| `/context [all]` | 현재 컨텍스트 사용량 표시 |
| `/config` | 설정 패널 열기 |
| `/status` | 버전, 모델, 계정, 연결 상태 표시 |
| `/doctor` | 설치 상태 점검 |
| `/usage` | 세션 비용, 한도, 활동 통계 표시 |
| `/cost` | `/usage`의 별칭 |
| `/stats` | `/usage`의 별칭 |
| `/model [model]` | 세션 내에서 모델 변경 |
| `/effort [level\|auto]` | 추론 강도 조정 |
| `/resume [session]` | 다른 대화 재개 |
| `/rename [name]` | 현재 세션 이름 변경 |
| `/branch [name]` | 현재 지점에서 대화 분기 |
| `/export [filename]` | 현재 대화 내보내기 |
| `/diff` | 대화형 diff 뷰어 열기 |
| `/ide` | IDE 연동 관리 |
| `/mcp` | MCP 기능 접근 |

### 키보드 단축키

| 단축키 | 동작 |
|----------|--------|
| `Ctrl+C` | 중단; 입력이 비어있으면 입력을 지우고, 한 번 더 누르면 종료 |
| `Ctrl+D` | Claude Code 종료 |
| `Ctrl+O` | 트랜스크립트 뷰어 켜기/끄기 |
| `Ctrl+R` | 명령어 히스토리 역방향 검색 |
| `Ctrl+T` | 작업(task) 목록 켜기/끄기 |
| `Esc` | 현재 응답 또는 도구 호출 중단 |
| `Esc Esc` | 입력 초안 지우기 (입력이 비어있으면 되돌리기 메뉴 열기) |
| `Shift+Tab` | 권한 모드 전환 |
| `Alt+P` / `Option+P` | 모델 전환 |
| `Alt+T` / `Option+T` | 확장 사고 켜기/끄기 |
| `Alt+O` / `Option+O` | 패스트 모드 켜기/끄기 |
| `@` | 파일 경로 언급 자동완성 |
| `!` | 셸 모드 |
| `Up/Down` | 여러 줄 입력 내 이동 또는 명령어 히스토리 탐색 |

## 모범 사례

### 성능 팁

- 작업 간 `/clear`를 자주 사용하세요
- `--max-turns`로 컨텍스트를 제한하세요
- 긴 대화에는 `/compact`를 사용하세요
- `--allowedTools`로 정확한 도구를 지정하세요

### 보안 팁

- `--dangerously-skip-permissions` 사용을 피하세요
- 위험한 명령어에는 `--disallowedTools`를 사용하세요
- 도구 권한을 주기적으로 점검하세요
- Claude Code를 최신 버전으로 유지하세요

### 워크플로우 팁

- `.claude/commands/`에 커스텀 슬래시 명령어를 만드세요
- 자동화에는 `--output-format json`을 사용하세요
- 복합 워크플로우에는 파이프를 활용하세요
- 장시간 작업에는 세션 ID를 활용하세요

## 레벨별 모범 사례

### 초급자 모범 사례 (레벨 1-3)

- 기본 명령어부터 시작해 점진적으로 익히세요
- 새로운 기능을 발견하려면 `/help`를 자주 사용하세요
- 복잡한 쿼리 전에 간단한 쿼리로 연습하세요
- 작업 간 `/clear`로 세션을 집중된 상태로 유지하세요

### 중급자 모범 사례 (레벨 4-6)

- 보안을 위해 도구 권한을 마스터하세요
- 자동화 스크립트에는 JSON 출력을 사용하세요
- 고급 연동을 위해 MCP를 배우세요
- 반복 작업을 위해 커스텀 슬래시 명령어를 만드세요

### 고급자 모범 사례 (레벨 7-10)

- 반복 작업에는 자동화된 워크플로우를 구현하세요
- 팀 협업에는 엔터프라이즈 기능을 활용하세요
- 성능을 모니터링하고 리소스 사용을 최적화하세요
- 프로덕션 환경에서는 보안 모범 사례를 따르세요

## 프로 팁 & 노하우

### 효율성 팁

- 장시간 실행되는 작업을 취소할 때는 `Ctrl+C`를 사용하세요
- 복합 설정을 위해 여러 플래그를 조합하세요
- 다단계 데이터 처리에는 파이프를 활용하세요
- 성능 향상을 위해 반복 작업을 캐싱하세요

### 보안 프로 팁

- 위험한 명령어에는 항상 `--disallowedTools`를 사용하세요
- 프로덕션 환경에서는 감사 로깅을 활성화하세요
- 도구 권한을 주기적으로 점검하세요
- 민감한 작업에는 `--security-enabled`를 사용하세요

### 워크플로우 프로 팁

- 자주 쓰는 자동화 패턴은 템플릿으로 만드세요
- 장시간 협업 작업에는 세션 ID를 활용하세요
- 자동화 스크립트에 적절한 오류 처리를 구현하세요
- 팀 공유를 위해 커스텀 워크플로우를 문서화하세요

## 자주 겪는 문제 해결

### 설치 문제

```bash
# 설치 확인
claude --version
claude auth status
claude doctor

# 네이티브 Claude Code 재설치
claude install stable

# macOS, Linux, WSL용 네이티브 설치
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# Windows CMD
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd

# 이전에 npm으로 설치했다면
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code
```

### 성능 문제

```bash
# 성능 향상을 위해 컨텍스트 비우기
/clear

# 컨텍스트 크기 제한
claude -p --max-turns 3 "focused query"

# 컴팩트 모드 사용
/compact "keep only essentials"
```

### 권한 문제

```bash
# 현재 권한 확인
claude --list-permissions

# 권한 초기화
claude --reset-permissions

# 특정 권한 설정
claude --allowedTools "Bash(git:*)" --disallowedTools "Bash(rm:*)"
```

## 🤝 기여하기

기여를 환영합니다! 가이드라인은 Claude Code 공식 문서를 참고해주세요.

### 기여하는 방법

- 🐛 버그나 이슈 제보
- 📝 문서 개선
- ✨ 새로운 명령어 예시 추가
- 🔧 명령어 테스트 및 결과 공유

## 📄 라이선스

이 치트시트는 MIT 라이선스로 제공됩니다.

## ⭐ 후원 및 응원

이 치트시트가 도움이 되었다면 다른 개발자들에게도 공유해주세요!
Claude Code를 마스터하는 데 도움이 되었다면:

- ⭐ GitHub 저장소에 스타를 눌러주세요
- 📢 다른 개발자들과 공유해주세요
- 💬 댓글로 피드백을 남겨주세요
- 🔄 업데이트 소식을 받아보려면 팔로우해주세요

## 참고 자료 및 추가 학습

Claude Code 관련 더 많은 자료는 Anthropic 공식 문서를 참고하세요.

- [Claude Code 공식 문서](https://code.claude.com/docs/en/overview)
- [Claude Code 설치 가이드](https://code.claude.com/docs/en/setup)
- [Claude Code CLI 레퍼런스](https://code.claude.com/docs/en/cli-reference)
- [Claude Code 명령어 레퍼런스](https://code.claude.com/docs/en/commands)
- [Claude Code 대화형 모드](https://code.claude.com/docs/en/interactive-mode)
- [Claude Code 세션 관리](https://code.claude.com/docs/en/sessions)
- [Claude Code GitHub 저장소](https://github.com/anthropics/claude-code)
- [Anthropic API 문서](https://docs.anthropic.com)
- [MCP 문서](https://code.claude.com/docs/en/mcp)

**공식 Claude Code 문서 기준 최종 확인일**: 2026년 5월 26일
