# LearningPacer — Chat Mode Evaluation Set
# Prompt version: v1.0 (structured JSON output)
# 15 representative ELEC3120 test questions
#
# HOW TO USE
# ----------
# 1. Run each question in Chat Mode.
# 2. Record the actual question_type and which optional fields were populated.
# 3. Score each dimension 1–3 (1=poor, 2=acceptable, 3=good).
# 4. Note the failure layer: prompt / retrieval / rendering / tool / UI
# 5. Only edit the prompt if ≥3 questions fail the same dimension.

---

## Q01 — Comparison: TCP vs UDP
**Input:** "What is the difference between TCP and UDP?"
**Expected question_type:** `comparison`
**Required non-null fields:** `table`, `exam_tip`, `check_understanding`
**Table must include rows for:** reliability, ordering, connection setup, speed/overhead, use cases
**main_explanation:** brief 2–3 sentence intro only — detail lives in the table
**diagram:** null (comparison table is sufficient)

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q02 — Concept: TCP congestion control
**Input:** "Explain TCP congestion control."
**Expected question_type:** `concept`
**Required non-null fields:** `main_explanation`, `diagram`, `exam_tip`, `check_understanding`
**diagram type:** `stateDiagram-v2` (Slow Start → Congestion Avoidance → Fast Recovery)
**elec3120_context:** should reference Congestion Control lecture (Lecture 7/8)
**main_explanation must mention:** ssthresh, AIMD, slow start, triple dup ACK vs timeout distinction

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q03 — Process: TCP three-way handshake
**Input:** "Walk me through the TCP three-way handshake."
**Expected question_type:** `process`
**Required non-null fields:** `main_explanation`, `diagram`, `check_understanding`
**diagram type:** `sequenceDiagram` with SYN / SYN-ACK / ACK messages
**Null fields:** `calculation_steps`, `table`
**exam_tip:** optional but valuable — TIME_WAIT or ISN randomisation

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q04 — Calculation: TCP throughput
**Input:** "A TCP connection has RTT = 30 ms and a window size of 64 KB. What is the maximum throughput?"
**Expected question_type:** `calculation`
**Required non-null fields:** `calculation_steps`
**calculation_steps.setup:** state formula: Throughput = Window Size / RTT
**calculation_steps.steps:** [convert 64 KB to bits, convert 30 ms to seconds, divide]
**calculation_steps.answer:** ~17.07 Mbps
**calculation_steps.common_mistakes:** forgetting to convert KB→bits or ms→s
**Null fields:** `table`, `diagram`

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q05 — Concept/Process: How DNS works
**Input:** "What is DNS and how does it work?"
**Expected question_type:** `concept` or `process`
**Required non-null fields:** `main_explanation`, `diagram`, `elec3120_context`
**diagram type:** `sequenceDiagram` showing recursive resolution (Client → Local DNS → Root → TLD → Authoritative)
**elec3120_context:** Application Layer, Lecture 2/3
**exam_tip:** recursive vs iterative — local DNS does recursive; queries to root/TLD/auth are iterative

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q06 — Comparison: IPv4 vs IPv6
**Input:** "Compare IPv4 and IPv6."
**Expected question_type:** `comparison`
**Required non-null fields:** `table`, `exam_tip`
**Table rows must include:** address length, header size, NAT requirement, checksum, fragmentation, auto-configuration
**check_understanding:** ask about a specific IPv6 feature absent in IPv4

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q07 — Process: DHCP
**Input:** "How does DHCP assign an IP address?"
**Expected question_type:** `process`
**Required non-null fields:** `main_explanation`, `diagram`, `check_understanding`
**diagram type:** `sequenceDiagram` with DISCOVER / OFFER / REQUEST / ACK (DORA)
**exam_tip:** optional — note that DHCP uses UDP broadcast (port 67/68)

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q08 — Factual: HTTP port
**Input:** "What port does HTTP use?"
**Expected question_type:** `factual`
**Required non-null fields:** `main_explanation` (1–2 sentences, mention port 80 and HTTPS port 443)
**All optional fields:** null or omitted
**summary:** should be omitted
**Anti-requirement:** NO exam_tip, NO check_understanding, NO table, NO diagram — model must resist adding them

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q09 — Concept: NAT
**Input:** "Explain Network Address Translation (NAT)."
**Expected question_type:** `concept`
**Required non-null fields:** `main_explanation`, `diagram`, `elec3120_context`, `exam_tip`
**diagram type:** `flowchart LR` showing private IP → NAT table lookup → public IP translation
**exam_tip:** NAT breaks end-to-end connectivity; often cited as motivation for IPv6

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q10 — Calculation: Propagation delay
**Input:** "A link is 5000 km long and the signal travels at 2×10⁸ m/s. What is the propagation delay?"
**Expected question_type:** `calculation`
**Required non-null fields:** `calculation_steps`
**calculation_steps.setup:** d = distance / propagation speed
**calculation_steps.steps:** [convert 5000 km to 5×10⁶ m, divide by 2×10⁸, express as 25 ms]
**calculation_steps.answer:** 25 ms
**calculation_steps.common_mistakes:** forgetting to convert km → m; confusing propagation delay with transmission delay

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q11 — Comparison: Distance vector vs link state routing
**Input:** "What are the differences between distance vector and link state routing algorithms?"
**Expected question_type:** `comparison`
**Required non-null fields:** `table`, `main_explanation`, `exam_tip`, `check_understanding`
**Table rows:** convergence speed, knowledge (local vs global), message overhead, algorithm (Bellman-Ford vs Dijkstra), example protocols (RIP vs OSPF), count-to-infinity problem (DV only)

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q12 — Process: TCP connection termination
**Input:** "Describe the TCP connection termination process."
**Expected question_type:** `process`
**Required non-null fields:** `main_explanation`, `diagram`, `check_understanding`
**diagram type:** `sequenceDiagram` with 4-way FIN/ACK exchange
**elec3120_context:** must mention TIME_WAIT state and why it exists (2×MSL)
**exam_tip:** half-close semantics — each direction closed independently

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q13 — Concept: Sliding window protocol
**Input:** "What is the sliding window protocol and how does it affect throughput?"
**Expected question_type:** `concept`
**Required non-null fields:** `main_explanation`, `exam_tip`, `check_understanding`
**main_explanation must mention:** window size W, pipelining, relationship to bandwidth-delay product
**check_understanding:** ask about what limits throughput when window is too small (bandwidth-delay product)
**diagram:** optional — a timeline showing multiple in-flight packets would help

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q14 — Casual: Greeting
**Input:** "Hi, how are you?"
**Expected question_type:** `casual`
**Required non-null fields:** `title` ("Hello!" or similar), `main_explanation` (short friendly reply mentioning capabilities)
**All optional fields:** null — absolutely no table, no diagram, no exam_tip, no check_understanding
**Anti-requirement:** model must NOT fabricate course content or add academic structure

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Q15 — Calculation: Shannon capacity
**Input:** "A channel has bandwidth 4 MHz and SNR of 100. What is the maximum data rate according to Shannon's theorem?"
**Expected question_type:** `calculation`
**Required non-null fields:** `calculation_steps`
**calculation_steps.setup:** C = B × log₂(1 + SNR)
**calculation_steps.steps:** [B = 4×10⁶ Hz, SNR = 100, log₂(101) ≈ 6.658, C = 4×10⁶ × 6.658]
**calculation_steps.answer:** ≈ 26.63 Mbps
**calculation_steps.common_mistakes:** using log₁₀ instead of log₂; confusing Shannon (noisy) with Nyquist (noiseless)
**exam_tip:** distinguish Shannon capacity from Nyquist rate — Shannon gives theoretical max with noise

| Dimension | Score (1–3) | Notes |
|---|---|---|
| correctness | | |
| course alignment | | |
| teaching usefulness | | |
| format compliance | | |
| citation quality | | |
**Observed failure:** —
**Failure layer:** —

---

## Scoring Summary

| Q | Type | correctness | course align | teaching | format | citation | Failure layer |
|---|---|---|---|---|---|---|---|
| 01 | comparison | | | | | | |
| 02 | concept | | | | | | |
| 03 | process | | | | | | |
| 04 | calculation | | | | | | |
| 05 | concept/process | | | | | | |
| 06 | comparison | | | | | | |
| 07 | process | | | | | | |
| 08 | factual | | | | | | |
| 09 | concept | | | | | | |
| 10 | calculation | | | | | | |
| 11 | comparison | | | | | | |
| 12 | process | | | | | | |
| 13 | concept | | | | | | |
| 14 | casual | | | | | | |
| 15 | calculation | | | | | | |

---

## Prompt Versioning Log

| Version | Date | Change | Justification |
|---|---|---|---|
| v1.0 | 2026-04-08 | Initial structured JSON output contract | Replace free-form markdown to fix format instability |
