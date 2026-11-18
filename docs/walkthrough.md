# Hướng dẫn đọc harness — cho Quan

> Viết bằng tiếng Việt, chỉ dành cho Quan (agent không cần đọc file này). Nguồn sự thật vẫn là [spec.md](spec.md).
> Mục tiêu: đọc xong, bạn giải thích lại được harness làm gì, từng bước ra sao, và mỗi file trong repo để làm gì.
> Mỗi lần ra version mới, file này được cập nhật cùng lúc (spec, nguyên tắc 12).

Nên đọc theo thứ tự sau, mỗi phần khoảng 10–20 phút:
1. **Mục 1:** harness là gì, gói trong một trang.
2. **Mục 2:** đi lại từng version để thấy vì sao mọi thứ như bây giờ.
3. **Mục 3:** tự mở sandbox và đối chiếu từng bước.
4. **Mục 4:** đi qua repo harness, từng thư mục.
5. **Mục 5:** v0.4 sẽ làm gì.

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

| | v0.1 Skeleton | v0.2 Close the loop | v0.2.1 | v0.3 Workflow v2 |
|---|---|---|---|---|
| Ngày | 2026-11-15 | 2026-11-15 | 2026-11-15 | 2026-11-18 |
| PR harness | #1–#6 | #7–#11 | #12 | #13–#18 |
| Đơn vị làm việc | — | 1 task = 1 branch = 1 PR | như v0.2 | **1 feature = 1 branch = 1 PR** |
| Grill và spec nằm ở đâu | — | commit thẳng vào `master` | như v0.2 | trên branch của feature |
| Gate A | — | sửa `Status: approved` trong file | như v0.2 | draft PR; "approved" trong chat hoặc comment |
| Số feature mở cùng lúc | — | 1 | 1 | nhiều |
| Kiểm chứng | test tự động | test + e2e trên git thật | **agent thật** trên sandbox | agent thật, **2 feature song song** |

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

> ⚠️ **Dễ nhầm:** số version của **spec** khác số version của **harness**. Harness v0.3 đi với spec v0.4. Mục 5 đề xuất từ v0.4 trở đi dùng chung một số.

---

## 3. Tự xem sandbox — từng bước

**Sandbox là gì:** repo private [harness-sandbox](https://github.com/Quannguyen830/harness-sandbox), ở máy tại `D:\Driver_D\harness-sandbox`. Đây là chỗ **thử harness**, không phải sản phẩm. Sản phẩm (CLI đếm từ) cố ý nhỏ, để lỗi nào thấy được đều là lỗi của workflow. Agent chạy bằng plugin harness thật; mình đóng vai bạn ở các comment và câu trả lời.

**Sandbox kiểm tra máy móc, không đo chất lượng.** Fit score ở đây do mình cho, nên không có ý nghĩa.

### Bước 1: nhìn tổng thể (2 phút)
Mở [danh sách PR (cả đã đóng)](https://github.com/Quannguyen830/harness-sandbox/pulls?q=is%3Apr).
- **PR #1, #2:** workflow cũ v0.2, mỗi task một PR (feature 001 có 2 task nên có 2 PR).
- **PR #3:** workflow mới, cả feature 002 trong một PR. **Đã merge.**
- **PR #4:** feature 003, một PR. **Đang mở và đang conflict** với `master` (lý do ở bước 5).

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

### Bước 5: conflict (đang chờ thử)
- PR #3 sửa `bin/wordcount.js`, `test/cli.test.js`, `docs/product.md`. PR #4 cũng sửa đúng ba file đó.
- Khi #3 merge xong, #4 bị conflict. Đây là chuyện bình thường khi mở nhiều feature cùng lúc.
- **Kỳ vọng:** `/next` thấy conflict, chọn bước `pr` (G4). Bước này rebase #4 lên `master`, gộp `--lines` với dấu phẩy, chạy test, push, rồi dừng ở Gate B.
- **Hiện trạng:** script đã báo đúng `"step": "pr"`, lý do "PR #4 conflicts with master". Còn lần chạy agent thật thì bị crash do lỗi của CLI `claude` (segfault trong Bun) trước khi làm gì, nên **phần rebase chưa được thử**.

Bạn tự thử được:

```powershell
cd D:\Driver_D\harness-sandbox
```
```powershell
claude --plugin-dir D:/Driver_D/harness
```

Rồi gõ `/harness:next` và xem agent làm từng bước.

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
| 6 | `templates/` | Mẫu grill, spec, PR, và `project/` (file mà `init-project` tạo cho project) | Lướt |
| 7 | `hooks/` | `verify.mjs`: không cho dừng khi test đỏ. `safety/`: 3 hook an toàn mượn từ ngoài | Biết chúng làm gì là đủ |
| 8 | `scripts/` khác | `init-project`, `new-feature`, `check-spec`, `pr-feedback`, `collect-logs`, `upstream-diff`, `selftest` | Biết mỗi cái làm gì (dòng đầu mỗi file có ghi) |
| 9 | Skill mượn: `tdd`, `diagnosing-bugs`, `domain-modeling`, `codebase-design`, `code-review`, `prototype`, `writing-for-agents`, `frontend-design`, `find-docs` | Dùng theo nhu cầu, nguồn ghi trong `SOURCES.md` | Biết tên và lúc nào dùng |
| 10 | `SOURCES.md`, `vendor-licenses/` | Mỗi thứ mượn: lấy từ đâu, bản nào, license gì, đã sửa gì | Lướt |
| 11 | `test/`, `benchmarks/`, `docs/reports/` | Test tự động; số đo mỗi lần chạy; báo cáo mỗi version | Khi cần |

**Gear và component khác nhau thế nào.** *Gear* là một **bước** của quy trình, mô tả bằng hợp đồng trong `gears/`. *Component* là **công cụ** mà bước đó dùng: skill, command, hook, script, template. Ví dụ: gear `pr` dùng các component `skills/pr`, `skills/code-review`, `templates/pr.md`. `selftest` kiểm tra rằng mọi component đều được ít nhất một gear dùng, và không có hai component làm cùng một việc.

---

## 5. Chuẩn bị v0.4

Đề xuất: **chia v0.4 thành từng bước nhỏ, mỗi bước bạn hiểu và duyệt rồi mới làm bước sau.**

| # | Việc | Vì sao | Chạm vào `~/.claude`? |
|---|---|---|---|
| 1 | Thử nốt conflict trên sandbox (mục 3, bước 5), tốt nhất là bạn tự gõ `/harness:next` | Bài thử duy nhất của v0.3 còn dở | Không |
| 2 | `CLAUDE.md` của project không còn chép luật workflow; luật nằm trong plugin, project chỉ giữ phần riêng của nó | Sandbox vẫn mang luật cũ (branch theo task) vì project không nhận thay đổi của template | Không |
| 3 | Dùng chung một số version cho spec và harness | Hiện spec v0.4 đi với harness v0.3, dễ nhầm | Không |
| 4 | Dọn máy theo spec §9.1: gỡ plugin trùng (mattpocock-skills, context7, code-review, code-simplifier, figma, frontend-design, playwright, 3 hook an toàn, 4 hook đang tắt…); cắt `~/.claude/CLAUDE.md` còn sở thích cá nhân | Để mọi session chỉ nạp harness: mỗi việc một công cụ | **Có:** duyệt từng mục |
| 5 | Kiểm tra: mở session mới ở một repo bất kỳ, chỉ thấy skill của harness | Tiêu chí hoàn thành của v0.4 | Không |

Sau v0.4: chạy habit tracker, **bạn tự điều khiển**. Đó là lần đo thật đầu tiên.
