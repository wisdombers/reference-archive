# Reference Archive

콘텐츠 제작자가 광고 이미지, 영상 링크, 카피 문구, 브랜드 캠페인 사례를 저장하고 다시 찾는 개인 레퍼런스 아카이브입니다.

## 기능

- Supabase Google OAuth 로그인
- Supabase 이메일 매직링크 로그인
- 로그인 사용자별 레퍼런스 저장
- 레퍼런스 추가, 편집, 삭제, 보기 페이지
- 카드형 대시보드
- 제목, URL, 한 줄 메모, 태그, 상세 노트 검색
- 태그 필터
- 최신순, 오래된순 정렬
- URL 정보 자동 가져오기 API
- CSV 내보내기 API
- Supabase DB + RLS
- Netlify 배포 설정

## 기술 스택

- Next.js App Router
- TypeScript
- Supabase Auth, DB, RLS
- Netlify
- React Query
- Zustand
- Zod
- React Hook Form

## 로컬 실행

1. 의존성을 설치합니다.

```bash
npm install
```

2. 환경 변수를 만듭니다.

```bash
cp .env.example .env.local
```

3. `.env.local`에 Supabase 값과 현재 접속할 앱 주소를 입력합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL`은 Google 로그인과 매직링크가 돌아올 앱 주소입니다. 개발 서버가 `http://localhost:3001`에서 열리면 이 값도 `http://localhost:3001`로 바꾸고 개발 서버를 다시 시작하세요.

4. Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.

기존 MVP 데이터를 이미 사용 중이라면 같은 SQL을 다시 실행해도 됩니다. `summary`, `tags`, `note` 컬럼을 추가하고, 기존 `memo` 값은 `note`로 옮깁니다. 예전 `importance` 컬럼은 남아 있어도 앱에서는 더 이상 사용하지 않습니다.

5. 개발 서버를 실행합니다.

```bash
npm run dev
```

6. 브라우저에서 `.env.local`의 `NEXT_PUBLIC_SITE_URL`에 입력한 주소로 접속합니다.

## Supabase Auth Redirect URL 설정

Supabase 대시보드에서 `Authentication > URL Configuration`으로 이동한 뒤 아래 값을 설정합니다.

- Site URL: 로컬 개발 시 `NEXT_PUBLIC_SITE_URL`과 같은 값
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3001/auth/callback` (3001 포트를 사용할 때)
  - Netlify 배포 후 `https://your-site.netlify.app/auth/callback`

운영 배포 후에는 Site URL을 Netlify 도메인으로 바꾸거나, 로컬과 운영 Redirect URL을 모두 등록해두면 됩니다.

## Supabase Google Provider 설정

Google 로그인은 Supabase Auth Provider에서 설정합니다. Google Client Secret은 코드나 `.env.local`에 넣지 않습니다.

1. Google Cloud Console에서 OAuth Client를 만듭니다.
2. Application type은 `Web application`을 선택합니다.
3. Authorized JavaScript origins에 아래 값을 추가합니다.

```bash
http://localhost:3000
http://localhost:3001
https://your-site.netlify.app
```

4. Authorized redirect URIs에 Supabase가 안내하는 Callback URL을 추가합니다. 보통 아래 형식입니다.

```bash
https://your-project.supabase.co/auth/v1/callback
```

5. Supabase Dashboard에서 `Authentication > Providers > Google`로 이동합니다.
6. Google Provider를 Enable하고 Google Cloud에서 발급받은 Client ID와 Client Secret을 입력합니다.
7. Supabase `Authentication > URL Configuration`에 앱 Redirect URL을 등록합니다.

```bash
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://your-site.netlify.app/auth/callback
```

설정 후 로그인 페이지의 `Google로 계속하기` 버튼을 누르면 Google 인증을 거쳐 `/auth/callback`으로 돌아오고, 이후 대시보드로 이동합니다.

앱에서 Google OAuth를 시작할 때 사용하는 `redirectTo`는 `NEXT_PUBLIC_SITE_URL + /auth/callback`입니다. 예전 localhost 주소로 이동한다면 `.env.local`의 `NEXT_PUBLIC_SITE_URL` 값과 Supabase Redirect URLs를 먼저 확인한 뒤 개발 서버를 재시작하세요.

## Netlify 배포

1. GitHub에 저장소를 올립니다.
2. Netlify에서 `Add new site > Import an existing project`를 선택합니다.
3. Build command는 `npm run build`, Publish directory는 `.next`를 사용합니다.
4. Environment variables에 아래 값을 추가합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
```

5. Supabase Redirect URLs에 `https://your-site.netlify.app/auth/callback`을 추가합니다.
6. 배포합니다.

`netlify.toml`에 `@netlify/plugin-nextjs`가 설정되어 있어 Next.js App Router API 라우트와 서버 렌더링이 Netlify에서 동작합니다.

## 주요 파일

- `app/page.tsx`: 대시보드 서버 진입점
- `components/dashboard.tsx`: 검색, 태그 필터, 정렬, 카드 목록
- `components/login-form.tsx`: Google OAuth와 이메일 매직링크 로그인
- `components/reference-form.tsx`: 추가/편집 폼과 URL 정보 자동 가져오기 버튼
- `app/api/metadata/route.ts`: URL title, og:image 수집 API
- `app/api/export/route.ts`: 로그인 사용자 CSV export API
- `middleware.ts`: 비로그인 사용자의 보호 페이지 접근 차단
- `supabase/schema.sql`: 테이블, 인덱스, 트리거, RLS 정책

## 레퍼런스 필드

- `source_url`: 원본 URL
- `title`: 제목
- `thumbnail_url`: 썸네일 URL
- `summary`: 한 줄 메모
- `tags`: 쉼표로 입력하는 태그
- `note`: 상세 노트

## 세션 유지 확인

1. 로그인 후 대시보드 상단에 `현재 로그인: 이메일`이 보이는지 확인합니다.
2. 브라우저 새로고침을 해도 메인 페이지에서 대시보드가 유지되는지 확인합니다.
3. 브라우저 탭을 닫고 다시 `NEXT_PUBLIC_SITE_URL` 주소에 접속해 대시보드가 유지되는지 확인합니다.
4. `로그아웃` 버튼을 누르면 같은 메인 페이지에서 로그인 영역이 보이는지 확인합니다.

## Google 로그인 URL 점검 체크리스트

- `.env.local`의 `NEXT_PUBLIC_SITE_URL`이 지금 브라우저에서 접속하는 주소와 같은지 확인합니다.
- 로컬 포트가 3000에서 3001로 바뀌었다면 `.env.local` 값을 바꾸고 `npm run dev`를 다시 실행합니다.
- Supabase `Authentication > URL Configuration`의 Redirect URLs에 `NEXT_PUBLIC_SITE_URL/auth/callback`이 등록되어 있는지 확인합니다.
- Google Cloud OAuth의 Authorized JavaScript origins에 `NEXT_PUBLIC_SITE_URL`이 등록되어 있는지 확인합니다.
- Google Cloud OAuth의 Authorized redirect URIs에는 Supabase Provider 화면에서 안내하는 `https://your-project.supabase.co/auth/v1/callback` 주소를 등록합니다.

## 검증 명령

```bash
npm run lint
npx tsc --noEmit
npm run build
```
