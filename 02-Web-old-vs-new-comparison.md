# 02-Web Old vs New Explanation Comparison

- Lecture PDF: `C:\Users\adamb\OneDrive\Desktop\HKUST\ELEC3120\3120\02-Web.pdf`
- Old explanations source: `C:\Users\adamb\Downloads\slide_explanations_rows.csv` filtered to `lecture_id = 02-Web`
- New explanations source: current deployed Gemini-first `generate-single-slide` path from this workspace
- Sample used: the same 10 representative slides from the earlier comparison: `2, 6, 12, 20, 30, 40, 45, 59, 65, 80`
- Score key: `0 = poor/off-slide`, `1 = mixed/partly supported`, `2 = strong`
- Generation note: `lecture_slides_course` only had 56 of 81 `02-Web` rows, so the missing source rows were backfilled from the PDF before invoking the current generator.

| slide_number | slide text/topic summary | old explanation summary | new explanation summary | faithfulness to slide (old/new) | specificity (old/new) | ELEC3120 alignment (old/new) | teaching usefulness (old/new) | final verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | Warmup on communication media, velocity factor, and a link-delay thought exercise. | Reframes the warmup as propagation vs transmission delay with a bottleneck conclusion. | Stays closer to the prompts: media, velocity factor, latency, and why shorter distance may matter. | `1 / 2` | `2 / 2` | `2 / 2` | `2 / 2` | better |
| 6 | Creating a network app: programs run on end systems, not network-core devices. | Explains edge-host app development and why routers/switches are not programmed by app developers. | Covers the same point, tied directly to the listed network environments and end-system layering. | `2 / 2` | `2 / 2` | `2 / 2` | `2 / 2` | similar |
| 12 | Sparse history slide naming MINITEL and Project Xanadu as pre-WWW hypertext systems. | Adds substantial outside history, dates, and claims about why the Web became dominant. | Still adds outside context, but stays more focused on "examples before the WWW." | `1 / 1` | `1 / 1` | `1 / 1` | `1 / 1` | better |
| 20 | HTML as a simple language for text, images, and hypertext, with a basic code example. | Explains HTML structure and the roles of the shown tags. | Explains the original purpose of HTML and the example document structure more compactly. | `2 / 2` | `2 / 2` | `2 / 2` | `2 / 2` | similar |
| 30 | HTTP/1.0 response time: RTT definition and `2RTT + file transmission time`. | Walks through handshake, request/response timing, and the formula. | Gives a tighter walkthrough of the same timing components and formula. | `2 / 2` | `2 / 2` | `2 / 2` | `2 / 2` | better |
| 40 | HTTP performance problem: multiple objects, one GET per TCP connection, lots of handshakes. | Explains one-object-per-connection retrieval with extra narrative around early web design. | More directly explains the naive retrieval method and handshake overhead. | `2 / 2` | `2 / 2` | `2 / 2` | `2 / 2` | better |
| 45 | Sparse diagram showing one connection followed by multiple requests under "Windowing." | Interprets the diagram via stop-and-wait removal, pipelining/windowing, and ACK behavior. | Interprets it as multiple requests in flight over one established connection, with less extra machinery. | `1 / 1` | `2 / 2` | `2 / 2` | `2 / 2` | better |
| 59 | HOL-blocking example: server decides to work on Streams 2 and 3 while Stream 1 is slow. | Frames it broadly as HTTP/1.1/HTTP/2 HOL mitigation with analogy-heavy explanation. | Focuses more directly on the depicted server behavior and stream reordering. | `1 / 1` | `2 / 2` | `2 / 2` | `2 / 2` | better |
| 65 | Very sparse receive-buffer diagram with `HTTP Server`, `TCP`, and buffer items `1` and `2`. | Speculates about OS buffering, two-step flow, speed mismatch, and TCP flow control. | Much more restrained: identifies the server stack and links it to the Layer-4 HOL discussion. | `1 / 1` | `1 / 1` | `2 / 2` | `1 / 1` | better |
| 80 | Roadmap slide listing HTTP, cookies, databases, JavaScript/web apps, and performance topics. | Turns the list into a broad narrative about web evolution and functionality. | Still interpretive, but somewhat tighter and better organized around the listed roadmap items. | `1 / 1` | `1 / 1` | `2 / 2` | `1 / 1` | better |

## Takeaway

For this sample, the new Gemini-first outputs are generally better because they are shorter, less rhetorical, and usually closer to the visible slide content. The improvement is strongest on sparse and diagram-led slides such as `45`, `59`, and `65`, where the old explanations tended to over-infer. The remaining weak spot is sparse history/roadmap material like `12` and `80`, where the new generator still adds context that is not explicitly on the slide.
