# Hướng dẫn đọc harness — cho Quan

> Viết bằng tiếng Việt, chỉ dành cho Quan (agent không cần đọc file này). Nguồn sự thật vẫn là [spec.md](spec.md).
> Mục tiêu: đọc xong, bạn giải thích lại được harness làm gì, từng bước ra sao, và mỗi file trong repo để làm gì.
> Mỗi lần ra version mới, file này được cập nhật cùng lúc (spec, nguyên tắc 12).

Nên đọc theo thứ tự sau, mỗi phần khoảng 10–20 phút:
1. **Mục 1:** harness là gì, gói trong một trang.
2. **Mục 2:** đi lại từng version để thấy vì sao mọi thứ như bây giờ.
3. **Mục 3:** tự mở sandbox và đối chiếu từng bước.
4. **Mục 4:** đi qua repo harness, từng thư mục.
5. **Mục 5:** trên máy bây giờ có gì (sau v0.4).

---

## 1. Harness trong một trang

**Vấn đề nó giải quyết.** Khi bạn nhờ Claude làm một feature, có ba chỗ hay hỏng:
- Claude hiểu sai bạn muốn gì.
- Claude làm xong nhưng bạn không biết nó đúng hay sai.
- Mỗi project lại cài một mớ skill/plugin khác nhau.

Harness sửa cả ba bằng **một quy trình cố định** và **một bộ cài duy nhất**.

**Quy trình: 5 bước, gọi là gear, và 2 cổng duyệt, gọi là gate.**

```
G1 Grill → G2 Spec → ⛔ Gate A → G3 Execute → G4 PR → ⛔ Gate B → (G5 Feedback bất cứ lúc nào có comment)
```

| Bước | Ai làm | Làm gì | Để lại gì |
|---|---|---|---|
| G1 Grill | Agent hỏi, bạn trả lời | Phỏng vấn bạn cho đến khi rõ feature | `grill.md` |
| G2 Spec | Agent | Viết spec: tiêu chí chấp nhận (EARS) và danh sách task, rồi mở **draft PR** | `spec.md`, draft PR |
| ⛔ Gate A | **Bạn** | Đọc spec, nói "approved" (trong chat hoặc comment trên PR), hoặc yêu cầu sửa | `> Status: approved` |
| G3 Execute | Agent | Mỗi lần làm một task, test trước, mỗi task một commit | commit `feat(NNN/Tn)` |
| G4 PR | Agent | Tự review theo spec, sửa lỗi, điền body PR, chuyển PR sang ready | commit `fix(NNN): self-review` |
| ⛔ Gate B | **Bạn** | Review, comment `Fit: N — ...`, rồi merge | fit score |
| G5 Feedback | Agent | Xử lý mọi comment của bạn, luôn trả lời bằng `[harness] ...` | reply `[harness]` |

**Bạn điều khiển bằng một lệnh:** `/harness:next`.
- Nó nhìn trạng thái (các branch `feature/*`, PR, comment, file docs) rồi chạy **đúng một bước tiếp theo**.
- `/harness:next auto` chạy liên tục cho tới khi gặp việc cần bạn (một gate hoặc một câu hỏi).
- `/harness:next <ý tưởng>` bắt đầu một feature mới.

**Một feature = một branch `feature/NNN-slug` = một PR.** Grill, spec, code và fit score của feature đó đi chung trên một PR. Có thể mở nhiều feature cùng lúc; `/next` làm hết những gì agent tự làm được, rồi mới dừng ở những chỗ cần bạn.

**Bộ cài trọn gói.** Harness là một Claude Code plugin, cài một lần cho cả máy. Mọi skill, hook và MCP mà project dùng đều đến từ đây. Muốn đổi cách làm việc ở mọi project thì sửa repo này.

```
upstream (Matt Pocock, Spec Kit, ...) → harness (repo này, bạn kiểm soát) → các project của bạn
```

---

## 2. Đi lại từng version

| | v0.1 Skeleton | v0.2 Close the loop | v0.2.1 | v0.3 Workflow v2 | v0.4 Machine cleanup |
|---|---|---|---|---|---|
| Ngày | 2026-11-15 | 2026-11-15 | 2026-11-15 | 2026-11-18 | 2026-11-18 |
| PR harness | #1–#6 | #7–#11 | #12 | #13–#18 | #19, #20, #22 |
| Đơn vị làm việc | — | 1 task = 1 branch = 1 PR | như v0.2 | **1 feature = 1 branch = 1 PR** | như v0.3 |
| Grill và spec nằm ở đâu | — | commit thẳng vào `master` | như v0.2 | trên branch của feature | như v0.3 |
| Gate A | — | sửa `Status: approved` trong file | như v0.2 | draft PR; "approved" trong chat hoặc comment | như v0.3 |
| Số feature mở cùng lúc | — | 1 | 1 | nhiều | nhiều |
| Luật workflow của project nằm ở | — | `CLAUDE.md` của project (chép từ template) | như v0.2 | như v0.2 | **plugin**, nạp lúc mở session |
| Harness trên máy | — | chỉ nạp tạm (`--plugin-dir`) | như v0.2 | như v0.2 | **cài thật**, là plugin duy nhất đang bật |
| Kiểm chứng | test tự động | test + e2e trên git thật | **agent thật** trên sandbox | agent thật, **2 feature song song** | phiên mới chỉ thấy skill `harness:*` |

### v0.1: Skeleton (PR #1–#6)
**Mục tiêu:** có khung, đi được từ ý tưởng đến spec đã duyệt và làm được một task.
- **#1:** khung plugin (`.claude-plugin/`), `SOURCES.md` (ghi nguồn mọi thứ mượn), `selftest` (tự kiểm tra cấu trúc repo), 4 skill của Matt.
- **#2:** `/next` và "máy trạng thái" `next-state.mjs`: đọc trạng thái rồi quyết định bước tiếp.
- **#3–#5:** ba gear đầu: grill, spec (template Spec Kit + EARS, có `check-spec` kiểm tra spec), execute. Thêm **Stop hook verify**: agent không được dừng khi `npm test` còn đỏ.
- **#6:** `init-project`: biến một repo bất kỳ thành "harness project" (`harness.json`, `CLAUDE.md`, `docs/`).

### v0.2: Close the loop (PR #7–#11)
**Mục tiêu:** một feature đi từ spec đến PR đã merge, và comment review của bạn được ghi lại.
- **#7–#8:** G4 PR (template PR) và G5 Feedback (đọc comment, sửa, ghi intervention log).
- **#9:** đo lường. `collect-logs` đếm số lần bạn phải can thiệp, theo gear và theo loại lỗi; `upstream-diff` so bản copy skill với bản gốc.
- **#10–#11:** test end-to-end trên repo git thật, báo cáo đầu tiên, tag `v0.2.0`.

### v0.2.1: chạy thật lần đầu (PR #12)
- Lần đầu cho **agent thật** chạy trên sandbox: feature 001 (CLI đếm từ), mình đóng vai bạn. Mọi gear đều chạy, fit score 4.
- **Bài học:** sau khi squash-merge, `/next` nhìn nhầm branch cũ. Đã sửa. Test tự động không bắt được lỗi kiểu này; chỉ chạy thật mới thấy.

### v0.3: Workflow v2 và bộ cài trọn gói (PR #13–#18)
**Vì sao đổi:** sau v0.2 bạn chỉ ra hai điều.
1. Grill, spec và code của một feature nên đi cùng nhau, thay vì docs vào `master` còn code thì rải ra nhiều PR.
2. Harness phải là bộ cài duy nhất: mọi thứ project dùng đều đến từ harness.

**Các PR:**
- **#13:** spec v0.4 ghi lại toàn bộ quyết định mới (D15–D23).
- **#14:** viết lại `/next` để chọn việc giữa nhiều feature; G2 mở draft PR; G4 tự review bằng `code-review`.
- **#15:** skill dùng theo nhu cầu: `writing-for-agents`, `frontend-design`, `find-docs`, Playwright.
- **#16:** 3 hook an toàn nằm trong harness: chặn lệnh nguy hiểm, bảo vệ file bí mật, chặn trùng tên khác hoa/thường.
- **#17:** sửa hai lỗi tìm thấy khi chạy thật. Khi không đọc được GitHub, `/next` giờ dừng lại (`blocked`) thay vì đoán. PR bị conflict với `master` thì quay về G4 để rebase.
- **#18:** báo cáo, benchmark, tag `v0.3.0`.

Sau đó bạn tự chạy `/next`. Agent rebase PR #4 lên `master`, bạn cho Fit 4 rồi merge. Vậy là cả hai feature song song đều đã vào `master`.

### v0.4: Dọn máy (PR #19, #20, #22)
**Mục tiêu:** một phiên Claude Code mới, ở bất kỳ repo nào, chỉ nạp harness cho mọi việc liên quan workflow.
- **#19:** file walkthrough này và nguyên tắc 12 ("Quan hiểu từng phần").
- **#20:** luật workflow chuyển vào plugin. Hook `hooks/session-rules.mjs` chạy lúc mở session; nếu repo có `harness.json`, nó in `templates/rules.md` vào context. `CLAUDE.md` của project giờ chỉ giữ luật riêng của project đó. Nhờ vậy, sửa luật trong harness là mọi project nhận ngay, không phải sửa từng repo (sandbox đã chuyển trong sandbox PR #5). Lý do: trong lần chạy v0.3, `CLAUDE.md` của sandbox vẫn dạy "mỗi task một branch".
- **#22:** dùng chung một số version (spec 0.4.0 = plugin 0.4.0; selftest báo lỗi nếu hai số lệch nhau), đánh dấu xong v0.3/v0.4 trong spec, báo cáo, tag `v0.4.0`.
- **Dọn máy**, duyệt từng mục (danh sách đầy đủ ở spec §9.1): cài plugin harness từ GitHub; gỡ 10 plugin trùng (mattpocock-skills, context7, frontend-design, playwright, 3 hook an toàn, code-review, code-simplifier, figma); chuyển 2 file của context7 vào backup; cắt `~/.claude/CLAUDE.md` còn sở thích cá nhân. **Giữ nguyên:** 4 hook đang tắt, 3 plugin đang tắt, và marketplace của hooks.

> **Một số version duy nhất từ 0.4.0.** Trước đây spec có số riêng (spec v0.3 đi với code v0.2, spec v0.4 đi với code v0.3). Từ giờ đầu spec ghi `Version: 0.4.0`, trùng với `plugin.json` và git tag.

---

## 3. Tự xem sandbox — từng bước

**Sandbox là gì:** repo private [harness-sandbox](https://github.com/Quannguyen830/harness-sandbox), ở máy tại `D:\Driver_D\harness-sandbox`. Đây là chỗ **thử harness**, không phải sản phẩm. Sản phẩm (CLI đếm từ) cố ý nhỏ, để lỗi nào thấy được đều là lỗi của workflow. Agent chạy bằng plugin harness thật; mình đóng vai bạn ở các comment và câu trả lời.

**Sandbox kiểm tra máy móc, không đo chất lượng.** Fit score ở đây do mình cho, nên không có ý nghĩa.

### Bước 1: nhìn tổng thể (2 phút)
Mở [danh sách PR (cả đã đóng)](https://github.com/Quannguyen830/harness-sandbox/pulls?q=is%3Apr).
- **PR #1, #2:** workflow cũ v0.2, mỗi task một PR (feature 001 có 2 task nên có 2 PR).
- **PR #3:** workflow mới, cả feature 002 trong một PR. **Đã merge.**
- **PR #4:** feature 003, một PR. **Đã merge sau khi rebase** (lý do ở bước 5).
- **PR #5:** v0.4, cắt `CLAUDE.md` của sandbox chỉ còn phần riêng của project (luật workflow giờ đến từ plugin).

👉 **Tự kiểm tra:** vì sao feature 001 có 2 PR còn 002 chỉ có 1?

### Bước 2: đọc một feature từ đầu đến cuối qua commit (10 phút)
Mở [PR #3 → tab Commits](https://github.com/Quannguyen830/harness-sandbox/pull/3/commits). Mỗi commit là một bước trong mục 1:

| Commit | Bước | Mở file nào để xem |
|---|---|---|
| `docs(002): grill` | G1 | `docs/features/002-.../grill.md`: câu hỏi của agent và câu trả lời của "bạn" (mỗi câu có đáp án mặc định, `A: default` nghĩa là bạn chọn mặc định) |
| `docs(002): spec` | G2 | `spec.md`: tiêu chí A1, A2, … dạng "When …, the CLI shall …"; task T1, T2 kèm `(covers: A..)` |
| `docs(002): approve spec` | Gate A | chỉ một dòng `> Status: approved`, do comment "approved" của bạn |
| `feat(002/T1)` | G3 | code và test cho task 1; trong `spec.md`, T1 chuyển từ `[ ]` thành `[x]` |
| `feat(002/T2)` | G3 | task 2 |
| `fix(002): self-review` | G4 | những gì agent tự sửa sau khi review lại theo spec |
| `docs(002): record fit score` | G5 | dòng `Fit score: 5 — ...` ở cuối `spec.md` |

👉 **Tự kiểm tra:** chọn một tiêu chí bất kỳ (ví dụ A3), tìm test chứng minh nó. Gợi ý: xem mục "Covers" trong body PR.

### Bước 3: đọc body PR và comment (5 phút)
Mở [PR #3 → tab Conversation](https://github.com/Quannguyen830/harness-sandbox/pull/3).
- **Body PR** theo template: Tasks, Covers (tiêu chí → test), Evidence (output của test), Self-review, Merge danger, Docs in sync. Bạn duyệt ở Gate B bằng cách đọc body này, không cần đọc hết code.
- **Comment:** mỗi comment của bạn ("approved", "Fit: 5 …") đều có ngay sau đó một reply bắt đầu bằng `[harness]`. Đó là cách `/next` biết comment đã được xử lý: comment nào chưa có reply `[harness]` phía sau thì `/next` chọn bước G5.

### Bước 4: nhánh "đổi ý ở Gate A" (5 phút)
Mở [PR #4](https://github.com/Quannguyen830/harness-sandbox/pull/4) và [tab Commits của nó](https://github.com/Quannguyen830/harness-sandbox/pull/4/commits).
- Trong `grill.md` của 003, câu Q4: agent tự thấy feature 002 (`--lines`) đang mở trên branch khác và hỏi phạm vi. Đây là chỗ hai feature song song "biết" về nhau.
- Comment đầu: "Change of plan: only add the separator from 10,000 upwards".
- Commit `docs(003): start the thousands separator at 10,000` sửa **spec trước**, khi chưa có dòng code nào. Đây là nguyên tắc "code follows docs".
- `docs/interventions.md` trên branch 003 có dòng `changed-mind`. Đổi ý là quyền của bạn nên **không tính là lỗi** của harness.
- Lần duyệt này diễn ra **trong chat** (không phải comment), nên trên PR chỉ thấy commit `docs(003): approve spec`.

### Bước 5: conflict
- PR #3 sửa `bin/wordcount.js`, `test/cli.test.js`, `docs/product.md`. PR #4 cũng sửa đúng ba file đó.
- Khi #3 merge xong, #4 bị conflict. Đây là chuyện bình thường khi mở nhiều feature cùng lúc.
- **Kỳ vọng:** `/next` thấy conflict, chọn bước `pr` (G4). Bước này rebase #4 lên `master`, gộp `--lines` với dấu phẩy, chạy test, push, rồi dừng ở Gate B.
- **Kết quả:** script báo đúng `"step": "pr"`, lý do "PR #4 conflicts with master". Bạn chạy `/next`, agent rebase xong (các commit của #4 có hash mới), test pass (32 pass, 1 skip), bạn cho Fit 4 và merge.

Để tự chạy một feature mới trên sandbox:

```powershell
cd D:\Driver_D\harness-sandbox
```
```powershell
claude
```

Rồi gõ `/harness:next <ý tưởng>` và xem agent làm từng bước. Từ v0.4, harness đã được cài trên máy nên không cần `--plugin-dir` nữa.

### Bước 6: xem từ góc của `/next` (3 phút)
Trong `D:\Driver_D\harness` chạy:

```powershell
node scripts/next-state.mjs --root D:/Driver_D/harness-sandbox
```

Output là JSON: `step` (bước sẽ chạy), `kind` (`work` = agent tự làm, `needs-quan` = chờ bạn, `blocked` = dừng vì lỗi), `reason`, `waiting` (những gì đang chờ bạn). Đây chính là thứ `/next` đọc trước mỗi bước. **Mọi quyết định "làm gì tiếp" nằm ở đây**, không do agent tự đoán.

---

## 4. Đi qua repo harness

Đọc theo thứ tự này:

| Thứ tự | Đường dẫn | Là gì | Cần hiểu tới mức |
|---|---|---|---|
| 1 | `docs/spec.md` | Nguồn sự thật: nguyên tắc, workflow, quyết định | §1–§4 kỹ; phần còn lại lướt |
| 2 | `gears/*.md` | **Hợp đồng** của mỗi bước: đầu vào, đầu ra, khi nào dừng, dùng component nào, khi nào xóa | Đọc hết, mỗi file ~10 dòng |
| 3 | `commands/next.md` | Lệnh `/next`: chỉ dẫn mà agent đọc | Đọc hết |
| 4 | `scripts/lib/state.mjs` | Máy trạng thái: `featureStep` (một feature đang ở bước nào), `decide` (chọn giữa các feature) | Hàm `featureStep` và `decide`, ~60 dòng |
| 5 | `skills/{grill,spec,execute,pr,feedback}/` | Mỗi gear một skill: agent làm bước đó thế nào | Đọc lướt, mỗi file 1–2 trang |
| 6 | `templates/` | Mẫu grill, spec, PR; `rules.md` (luật workflow nạp vào mọi project); `project/` (file mà `init-project` tạo cho project) | Đọc `rules.md`, phần còn lại lướt |
| 7 | `hooks/` | `session-rules.mjs`: nạp luật lúc mở session. `verify.mjs`: không cho dừng khi test đỏ. `safety/`: 3 hook an toàn mượn từ ngoài | Biết chúng làm gì là đủ |
| 8 | `scripts/` khác | `init-project`, `new-feature`, `check-spec`, `pr-feedback`, `collect-logs`, `upstream-diff`, `selftest` | Biết mỗi cái làm gì (dòng đầu mỗi file có ghi) |
| 9 | Skill mượn: `tdd`, `diagnosing-bugs`, `domain-modeling`, `codebase-design`, `code-review`, `prototype`, `writing-for-agents`, `frontend-design`, `find-docs` | Dùng theo nhu cầu, nguồn ghi trong `SOURCES.md` | Biết tên và lúc nào dùng |
| 10 | `SOURCES.md`, `vendor-licenses/` | Mỗi thứ mượn: lấy từ đâu, bản nào, license gì, đã sửa gì | Lướt |
| 11 | `test/`, `benchmarks/`, `docs/reports/` | Test tự động; số đo mỗi lần chạy; báo cáo mỗi version | Khi cần |

**Gear và component khác nhau thế nào.** *Gear* là một **bước** của quy trình, mô tả bằng hợp đồng trong `gears/`. *Component* là **công cụ** mà bước đó dùng: skill, command, hook, script, template. Ví dụ: gear `pr` dùng các component `skills/pr`, `skills/code-review`, `templates/pr.md`. `selftest` kiểm tra rằng mọi component đều được ít nhất một gear dùng, và không có hai component làm cùng một việc.

---

## 5. Trên máy bây giờ (sau v0.4)

| Ở đâu | Có gì |
|---|---|
| Plugin đang bật | Chỉ `harness@harness`, cài từ GitHub |
| Plugin đang tắt (giữ lại theo ý bạn) | `auto-stage`, `git-safety`, `protect-tests`, `config-guard`, `superpowers`, `feature-dev`, `github`. Plugin đang tắt không nạp gì, nên không ảnh hưởng workflow |
| `~/.claude/CLAUDE.md` | 6 dòng sở thích cá nhân. Bản cũ ở `~/.claude/CLAUDE.md.bak` |
| Backup | `~/.claude/backups/harness-v0.4-2026-11-18/` |
| Còn trùng | Lệnh có sẵn `/code-review` của Claude Code và `harness:code-review`. Lệnh có sẵn không gỡ được; harness chỉ gọi bản của mình ở G4 |

**Cập nhật harness trên máy** sau mỗi lần merge:

```powershell
claude plugin update harness@harness
```

Tiếp theo: chạy habit tracker, **bạn tự điều khiển**. Đó là lần đo thật đầu tiên.
