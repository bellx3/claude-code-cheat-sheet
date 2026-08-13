// 배포된 사이트가 방금 커밋을 반영했는지 확인하는 유일한 수단.
// Netlify는 빌드 실패 시 사이트를 내리지 않고 직전 성공본을 계속 서빙한다 —
// 진짜 실패 모드는 "죽음"이 아니라 "조용한 미갱신"이고, 이 파일이 그걸 드러낸다.
//   curl -s https://<site>/build.json | jq -r .sha
export default class {
  data() {
    return { permalink: "/build.json", eleventyExcludeFromCollections: true };
  }

  render({ site, stats }) {
    return JSON.stringify(
      {
        sha: site.sha,
        branch: site.branch,
        builtAt: site.builtAt,
        items: stats.itemCount,
        detail: stats.detailCount,
        tasks: stats.taskCount,
        prompts: stats.promptCount,
      },
      null,
      1
    );
  }
}
