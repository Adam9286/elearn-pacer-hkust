# 02-Web Explanation Comparison

- Lecture PDF: `C:\Users\adamb\OneDrive\Desktop\HKUST\ELEC3120\3120\02-Web.pdf`
- Explanation source used: `C:\Users\adamb\Downloads\slide_explanations_rows.csv` filtered to `lecture_id = 02-Web`, because `data/evals/02-Web-old-explanations.csv` was not present in this repo.
- Sampling note: the lecture has 81 slides, so this file evaluates 10 representative slides across text-heavy, concept/formula, diagram-heavy, and roadmap-style content.
- Score key: `0 = poor/off-slide`, `1 = mixed/partly supported`, `2 = strong`

| slide_number | slide text/topic summary | old explanation summary | faithfulness to slide (0-2) | specificity (0-2) | ELEC3120 alignment (0-2) | teaching usefulness (0-2) | comments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | Warmup on communication media, velocity factor, and delay/performance questions for a 10 kbps, 10 km link. | Reframes the warmup as propagation vs transmission delay and argues the bottleneck is transmission time. | 1 | 2 | 2 | 2 | Good lecture-aware interpretation, but it adds terminology and the bottleneck conclusion that are not explicitly written on the slide. |
| 6 | Creating a network app: programs run on end systems, communicate over the network, and do not run on network-core devices. | Explains app-at-the-edge design and why developers do not program routers/switches. | 2 | 2 | 2 | 2 | Closely matches both the bullets and the end-system diagram. |
| 12 | Historical precursors to the Web: Minitel in France and Project Xanadu. | Expands both examples with outside historical detail, dates, and judgments about why the Web won. | 1 | 1 | 1 | 1 | Core topic is right, but most of the explanation is imported context rather than slide-grounded content. |
| 20 | HTML as an original simple language for displaying text, images, and hypertext, with a small code example. | Explains basic HTML structure and the roles of `html`, `head`, `body`, `div`, `p`, and `a`. | 2 | 2 | 2 | 2 | Strongly tied to the visible code snippet and stated purpose of HTML. |
| 30 | HTTP/1.0 response time: RTT definition and formula `2RTT + file transmission time` per object. | Walks through connection setup, request/response timing, and concludes with the response-time formula. | 2 | 2 | 2 | 2 | Faithful and instructionally useful; only minor expansion is naming the TCP handshake explicitly. |
| 40 | HTTP performance problem: multiple page objects, one GET per TCP connection, lots of handshakes in HTTP 0.9/1.0. | Explains why one object per connection is simple for servers but causes many costly TCP handshakes. | 2 | 2 | 2 | 2 | The examples are slightly elaborated, but the explanation stays anchored to the slide's stated bottleneck. |
| 45 | "Can we go faster?" diagram showing one connection followed by multiple HTTP GETs under "Windowing." | Interprets the slide as moving beyond stop-and-wait via pipelining/windowing so multiple requests can be in flight. | 1 | 2 | 2 | 2 | Good read of the diagram, but references to ACK behavior and later protocol families go beyond what is shown. |
| 59 | Head-of-line-blocking example: server sees Stream 1 is slow and starts work on Streams 2 and 3 instead. | Explains the server skipping ahead when one stream stalls and frames it as avoiding HOL blocking. | 1 | 2 | 2 | 2 | Diagram interpretation is solid, but the HTTP/1.1 vs HTTP/2 protocol framing is imported from surrounding context rather than this slide alone. |
| 65 | Receive buffer diagram with HTTP server above TCP and buffered items labeled `1` and `2`. | Describes a TCP receive buffer as a waiting room between the network and the HTTP server application. | 1 | 1 | 2 | 1 | Reasonable inference, but the slide itself is sparse and does not explicitly state OS-layer mechanics, timing mismatch, or buffering rationale. |
| 80 | Course roadmap listing: HTTP Protocol, Cookies, Databases, JavaScript/Web Apps, Persistent Connections, Pipelining, Parallel Connections. | Turns the list into a synthesized narrative about Web functionality and performance evolution. | 1 | 1 | 2 | 1 | Aligned with the lecture themes, but much more interpretive than the simple roadmap slide supports. |

## Overall Takeaway

The strongest old explanations are for slides with explicit technical content already on the page, such as slides 6, 20, 30, and 40. The weakest cases are sparse slides or roadmap/history slides, where the explanation often imports external context, narrative framing, or neighboring-slide concepts that are not directly evidenced by the slide itself.
