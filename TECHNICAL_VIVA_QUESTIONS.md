# HiveBoard - 100 Technical Viva Questions & Answers

This document contains 100 purely technical questions and answers that faculty or interviewers might ask about the HiveBoard project.

## 🏗️ General Architecture & System Design

1.  **Q: What is the high-level architecture of HiveBoard?**
    *   **A:** HiveBoard uses a MERN stack (MongoDB, Express.js, React, Node.js) with a Client-Server architecture. The client handles the UI and canvas rendering, while the server acts as a relay for real-time WebSocket events and an API for persistent data storage.

2.  **Q: Why did you choose the MERN stack for this application?**
    *   **A:** We chose MERN for its JavaScript uniformity (JSON everywhere), the non-blocking nature of Node.js which is excellent for real-time applications like a whiteboard, and React's component-based architecture for managing complex UI state.

3.  **Q: How does the real-time collaboration work conceptually?**
    *   **A:** It follows a Publish-Subscribe pattern using WebSockets. When a user performs an action (draws a stroke), the client publishes an event to the server. The server then broadcasts this event to all specific subscribers (users in the same room).

4.  **Q: Is your application Monolithic or Microservices-based?**
    *   **A:** It is currently a Monolithic architecture. The API, WebSocket server, and frontend static serving logic (in production) are handled by a single Node.js instance (or cluster). This reduces complexity for the current scale.

5.  **Q: How do you handle scalability if 10,000 users join?**
    *   **A:** Vertically, we can increase server resources. Horizontally, we would need to use a Redis Adapter for Socket.io to synchronize events across multiple server instances (Sticky Sessions would be required).

6.  **Q: What are the trade-offs of using Client-Side Rendering (CSR) vs Server-Side Rendering (SSR)?**
    *   **A:** We use CSR (Vite/React). The trade-off is a slightly slower initial load time, but much faster interactivity afterwards. For a whiteboard tool where the UI is highly dynamic and user-driven, CSR is preferable over SSR.

7.  **Q: Explain the data flow when a user opens the app.**
    *   **A:** 1. React loads. 2. `useEffect` checks for an Auth Token. 3. If valid, it connects the Socket. 4. A REST API call (`/api/meetings/:id`) fetches meeting metadata. 5. A Socket event (`request-canvas-state`) fetches the heavy whiteboard data.

8.  **Q: Why use WebSockets instead of HTTP Polling?**
    *   **A:** Latency and overhead. Polling requires opening a new TCP connection every second, creating massive header overhead and 1-2 second delays. WebSockets keep a single persistent connection open, allowing millisecond-level updates essential for drawing.

9.  **Q: What design patterns did you use in the backend?**
    *   **A:** We used the **MVC (Model-View-Controller)** pattern (conceptually, though "Views" are JSON responses). We also used the **Singleton** pattern for the Database connection and Socket instance.

10. **Q: How do you handle environment configurations?**
    *   **A:** We use `dotenv` files (`.env`). Sensitive keys like `MONGO_URI` and `JWT_SECRET` are never hardcoded and are injected at runtime.

---

## ⚛️ Frontend (React & TypeScript)

11. **Q: Why use TypeScript instead of JavaScript?**
    *   **A:** TypeScript provides static typing, which catches errors at compile-time (like passing a string where a number is expected). It drastically reduces runtime crashes and improves developer experience with IntelliSense.

12. **Q: Explain the React Component Lifecycle in your functional components.**
    *   **A:** We use Hooks. `useEffect` handles "mounting" (setup) and "unmounting" (cleanup, like removing event listeners). Dependencies in the array `[]` control when updates happen.

13. **Q: How do you manage global state?**
    *   **A:** We use React Context API (`AuthContext`, `GuestContext`) for data needed globally (user session). For component-specific state (like canvas strokes), we use local `useState` lifted up to the `Canvas` page.

14. **Q: What is the purpose of `useRef` in your Canvas component?**
    *   **A:** `useRef` persists values between renders *without* causing a re-render. We use it for accessing the HTML5 `<canvas>` DOM element directly and for storing high-frequency mutable data like mouse coordinates to avoid performance issues.

15. **Q: How does the `useCanvas` hook work?**
    *   **A:** It encapsulates the logic for the HTML5 Canvas API. It sets up the `requestAnimationFrame` loop, handles coordinate translation (screen to world space), and manages the `2d` context for drawing.

16. **Q: Why not use Redux?**
    *   **A:** For our scope, Context API + Local State was sufficient. Redux adds boilerplate. Since our real-time state (strokes) changes 60 times a second, putting it in a global Redux store might introduce unnecessary overhead compared to a ref-based approach.

17. **Q: How do you optimize the performance of the React rendering?**
    *   **A:** We use `useCallback` and `useMemo` to prevent expensive calculations or function re-creations on every render. We also minimize the state in the root component to prevent the entire tree from re-rendering on every mouse move.

18. **Q: What is Prop Drilling and how did you avoid it?**
    *   **A:** Prop drilling is passing data through many layers of components. We avoided it by using Context API for global data and Composition (passing components as children) where appropriate.

19. **Q: How do you handle routing?**
    *   **A:** We use `react-router-dom`. It enables client-side routing, allowing us to update the URL (e.g., `/canvas/:id`) without refreshing the page.

20. **Q: Explain the `key` prop in React lists.**
    *   **A:** The `key` helps React identify which items have changed, added, or removed. We use unique IDs (like `stroke._id`) instead of array indices to ensure the Virtual DOM updates efficiently and correctly.

21. **Q: What is the Virtual DOM?**
    *   **A:** It's a lightweight copy of the actual DOM. React changes the Virtual DOM first, compares it to the previous version (Diffing), and only updates the specific changed nodes in the real DOM (Reconciliation).

22. **Q: How do you handle side effects in your components?**
    *   **A:** We use the `useEffect` hook. For example, joining a socket room is a side effect triggered when the component mounts or when `roomId` changes.

23. **Q: What is "Lifting State Up"?**
    *   **A:** Moving shared state to the closest common ancestor. For example, `Canvas.tsx` holds the state for the `Toolbar` and the `ChatPanel` so they can interact with the same data.

24. **Q: How do you handle Guest users vs Logged-in users on the frontend?**
    *   **A:** We check the `AuthContext`. If no user is found, we fall back to `GuestContext`, which generates a temporary ID stored in `localStorage` or memory, allowing restricted access.

25. **Q: What happens if the internet disconnects?**
    *   **A:** Socket.io has built-in reconnection logic (`reconnection: true`). The client attempts to reconnect. However, we currently don't implement offline storage (indexedDB), so unsaved local strokes might be lost if the tab is closed before reconnecting.

---

## 🎨 Canvas & Graphics (HTML5)

26. **Q: How does the infinite canvas logic work?**
    *   **A:** It's a mathematical illusion. We apply a CSS/Canvas transformation: `Output = (Input - Offset) * Scale`. Panning changes the `Offset`, Zooming changes the `Scale`. We save and restore the context state (`ctx.save()`, `ctx.restore()`) during every frame.

27. **Q: Explain `requestAnimationFrame` vs `setInterval` for the game loop.**
    *   **A:** `requestAnimationFrame` syncs with the monitor's refresh rate (usually 60Hz), offering smoother animations and pausing when the tab is inactive to save battery. `setInterval` is imprecise and can cause frame jank.

28. **Q: How do you detect which object was clicked (Hit Testing)?**
    *   **A:** Since the canvas is just pixels, we maintain an array of mathematical descriptions of objects (e.g., coordinates, width, height). On click, we loop through this array (in reverse Z-order) and check if the mouse coordinates fall within the object's bounds.

29. **Q: How are curves drawn smoothly?**
    *   **A:** We capture raw mouse points, but simply connecting them with straight lines looks jagged. We use **Quadratic Bezier Curves** (`ctx.quadraticCurveTo`) between the midpoints of captured data points to create smooth strokes.

30. **Q: How do you handle different screen resolutions (Retina displays)?**
    *   **A:** We use `window.devicePixelRatio`. We scale the internal canvas size (width/height attributes) by this ratio but keep the CSS size same. Then we scale the Drawing Context by the ratio so drawing commands behave consistently.

31. **Q: How is the 'Eraser' implemented?**
    *   **A:** It is implemented as a stroke with `globalCompositeOperation = 'destination-out'`. This tells the canvas to "cut out" (make transparent) the pixels where the brush moves, revealing the background.

32. **Q: How do you export the canvas as an image?**
    *   **A:** We use the method `canvas.toDataURL('image/jpeg')`. Since our canvas is infinite, we assume the visible viewport is what the user wants, or we calculate the bounding box of all elements and create a temporary canvas to export.

33. **Q: Why are there two execution contexts (`canvasRef` and `gridCanvasRef`)?**
    *   **A:** Optimization. The Grid background is static. Redrawing the grid grid lines 60 times a second is wasteful. We draw the grid once on a bottom layer canvas, and only redraw the interactive content on the top layer.

34. **Q: How do you handle Z-indexing of elements?**
    *   **A:** The `strokes` array determines the order. We iterate from index 0 to length. The last item in the array is drawn last, appearing "on top". Send-to-back/front operations simply reorder this array.

35. **Q: How are sticky notes rendered?**
    *   **A:** Sticky notes are NOT drawn on the canvas. They are HTML `<div>` elements absolutely positioned on top of the canvas. This allows easier text editing, accessibility, and interaction compared to rendering text vectors.

---

## 🔙 Backend (Node.js & Express)

36. **Q: What is middleware in Express?**
    *   **A:** Functions that execute during the request-response cycle. They have access to `req`, `res`, and `next`. We use middleware for CORS, JSON parsing, and Authentication (`protect.js`).

37. **Q: Explain the RESTful API structure.**
    *   **A:** We segregate resources (Users, Meetings) into routes. We use standard HTTP methods: `GET` (read), `POST` (create), `PUT` (update), `DELETE` (remove).

38. **Q: How do you handle errors in the backend?**
    *   **A:** We use `try-catch` blocks in async route handlers. If an error occurs, we return a `500` status code with a JSON error message, preventing the server from crashing.

39. **Q: What is the purpose of `cors` package?**
    *   **A:** It handles Cross-Origin Resource Sharing headers. It allows our frontend (running on port 5173/8080) to request data from the backend (running on port 5000), which browsers block by default for security.

40. **Q: Why Node.js?**
    *   **A:** It uses the V8 engine and is single-threaded (Event Loop). This makes it extremely lightweight and efficient for I/O-heavy operations (like handling thousands of socket messages) compared to blocking architectures like threaded PHP/Java.

41. **Q: What is the Event Loop?**
    *   **A:** It's the mechanism that allows Node.js to perform non-blocking I/O operations. It offloads operations to the system kernel whenever possible, and puts callbacks in a queue to be executed when the stack is empty.

42. **Q: How does `express.json()` work?**
    *   **A:** It's a body-parsing middleware. It looks at the content-type header; if it's `application/json`, it waits for the data stream to finish, parses the JSON string into a JavaScript Object, and assigns it to `req.body`.

43. **Q: What is the difference between `require` and `import`?**
    *   **A:** `require` is CommonJS (older standard). `import` is ES Modules (modern standard). We use `import` (ESM) in our backend by setting `"type": "module"` in `package.json` to consistency with the frontend.

44. **Q: How do you protect private routes?**
    *   **A:** We implemented a `protect` middleware. It looks for the `Authorization: Bearer <token>` header, verifies the JWT using `jsonwebtoken`, attaches the user to `req.user`, and calls `next()`. If invalid, it returns 401.

45. **Q: What is the role of `socketHandlers.js`?**
    *   **A:** It separates the Socket logic from the HTTP server logic. This keeps `index.js` clean and follows the Separation of Concerns principle.

46. **Q: How do you enable file uploads (for images on canvas)?**
    *   **A:** Currently, we handle images as Base64 strings or URLs. For large deployments, we would use `multer` middleware to stream files to S3/Disk, but for simplicity, the current version might handle small payloads directly or rely on URL linking.

47. **Q: What status codes do you use?**
    *   **A:** 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error).

48. **Q: How do you perform validation?**
    *   **A:** We perform basic manual validation (checking if fields exist) in the controller. In a larger app, we would use a library like `Joi` or `Zod`.

49. **Q: Does the server keep any state?**
    *   **A:** Ideally, REST is stateless. However, for WebSockets, the server keeps in-memory state of active rooms and socket IDs. This makes it stateful, which impacts scaling strategies.

50. **Q: What is a "Race Condition" and could it happen here?**
    *   **A:** Yes. If two users edit the same text object simultaneously, the last one to reach the server overwrites the other. We use strict "Last-Write-Wins" logic currently. Realtime databases use CRDTs (Conflict-free Replicated Data Types) to solve this, but that is advanced.

---

## 📡 Socket.IO & Real-time Communication

51. **Q: What is the difference between WebSocket and HTTP?**
    *   **A:** HTTP is request-response (User asks -> Server replies -> Connection closes). WebSocket is full-duplex (Connection stays open, Client <-> Server can talk anytime).

52. **Q: Why Socket.IO and not raw WebSockets?**
    *   **A:** Socket.IO provides fallbacks (long-polling) if WebSockets are blocked. It also adds features like "Rooms" (grouping sockets), automatic reconnection, and custom events (`.emit`, `.on`) which simplifies development.

53. **Q: Explain the concept of "Rooms" in Socket.IO.**
    *   **A:** Rooms are server-side channels. When a user joins a meeting, we do `socket.join(meetingId)`. Events can then be broadcasted only to that room (`socket.to(meetingId).emit(...)`), ensuring data privacy between different meetings.

54. **Q: How do you handle the "Echo" problem?**
    *   **A:** When I draw a line, I see it immediately. I send it to the server. The server broadcasts it. If the server sends it back to *me*, I might draw it twice. We use `socket.to(room).emit` (broadcast to everyone *except* sender) to prevent this.

55. **Q: What data is sent in a `draw-stroke` packet?**
    *   **A:** The stroke configuration (color, width) and the array of coordinate points. It is serialized to JSON.

56. **Q: How do you synchronize a new user joining a session in progress?**
    *   **A:** When a user joins, the `request-canvas-state` event is fired. The server fetches the persistent state from MongoDB and sends the entire stroke history to that specific user.

57. **Q: What happens if the server restarts?**
    *   **A:** Socket connections drop. Clients attempt to reconnect. Since the drawing data is saved to MongoDB asynchronously, the state is preserved. When clients reconnect, they re-fetch the state.

58. **Q: Is the drawing TCP or UDP?**
    *   **A:** WebSockets run over TCP. This guarantees delivery and order (Packet 1 arrives before Packet 2), which is crucial for drawing. UDP would be faster but could result in missing stroke segments.

59. **Q: What is "Optimistic UI" updates?**
    *   **A:** We render the stroke on the user's screen *before* the server confirms receipt. This makes the app feel zero-latency to the user drawing, even if the network is slow.

60. **Q: How do you secure the WebSocket connection?**
    *   **A:** We share the same session/cookie or token handshake. The initial HTTP upgrade request can be validated with the JWT token to ensure only authorized users can connect to the namespace.

61. **Q: What is the `broadcast` flag?**
    *   **A:** In Socket.io, `socket.broadcast.emit` sends a message to all connected clients except the one that initiated the request.

62. **Q: How do you handle binary data?**
    *   **A:** Socket.io supports binary transmission (Buffers). While we mostly use JSON, for image uploads, binary streams would be more efficient to avoid Base64 overhead (33% size increase).

63. **Q: What is a Namespace in Socket.io?**
    *   **A:** It allows splitting the logic of the application over a single connection (e.g., `/chat` vs `/admin`). We currently use the default namespace `/`.

64. **Q: How to debug Socket.io issues?**
    *   **A:** We use the Network tab in Chrome DevTools (filter by WS) to see the raw frames, or server-side logging (`DEBUG=*` environment variable) to see internal heartbeats.

65. **Q: Can Socket.io work with a Load Balancer?**
    *   **A:** Not out of the box. Because the handshake relies on multiple requests, a client must interact with the same server process. "Sticky Load Balancing" is required to ensure requests stick to the originating server.

---

## 💾 Database (MongoDB)

66. **Q: Why NoSQL (MongoDB) instead of SQL?**
    *   **A:** Whiteboard data is unstructured and deeply nested (arrays of strokes, points objects). A JSON-document store like MongoDB aligns perfectly with the data structure. SQL would require complex joining of `Meetings`, `Strokes`, and `Points` tables.

67. **Q: Explain your Schema design for a Meeting.**
    *   **A:** The `Meeting` document contains metadata (title, owner) and embedded arrays (`canvasData.strokes`, `canvasData.stickyNotes`). We chose embedding over referencing for strokes because they are always accessed together with the meeting.

68. **Q: What is Mongoose?**
    *   **A:** It's an Object Data Modeling (ODM) library for MongoDB and Node.js. It manages relationships between data, provides schema validation, and translates code objects into database commands.

69. **Q: How do you handle concurrent writes to the same document?**
    *   **A:** MongoDB handles atomic document updates. We use array operators like `$push` to add strokes. However, without optimistic locking (versions), overwriting the whole document (`save()`) can lead to lost updates. We generally favor atomic updates like `findOneAndUpdate` for live data.

70. **Q: What are Indexes in MongoDB?**
    *   **A:** Data structures that improve search speed. We should index fields like `createdBy` or `meetingId` to prevent full collection scans when a user requests their dashboard properties.

71. **Q: Explain `populate()` in Mongoose.**
    *   **A:** It mimics an SQL `JOIN`. In our schemas, `createdBy` stores an ObjectId. `populate('createdBy')` replaces that ID with the actual User document during the query.

72. **Q: Is MongoDB ACID compliant?**
    *   **A:** Since version 4.0, MongoDB supports multi-document ACID transactions, though we primarily operate on single documents which have always been atomic.

73. **Q: How do massive stroke arrays affect performance?**
    *   **A:** MongoDB has a 16MB document limit. If a drawing has millions of points, we hit this limit. A scaling solution would be to "bucket" strokes into separate collections referenced by the meeting, or store the JSON blob in S3 and only keep the pointer in DB.

74. **Q: What is a MongoDB ObjectId?**
    *   **A:** A 12-byte unique identifier (timestamp + machine hash + process id + counter). It allows client-side ID generation that is statistically guaranteed to be unique, which we use for optimistic UI.

75. **Q: How do you connect the DB securely?**
    *   **A:** We use a connection string URI with username/password authentication, stored in `.env`. We also whitelist IP addresses in MongoDB Atlas.

---

## 🔐 Authentication & Security

76. **Q: How does JWT (JSON Web Token) authentication work?**
    *   **A:** The server signs a JSON payload (User ID) with a Secret Key. The client receives this token and sends it in the Header of subsequent requests. The server validates the signature. It is stateless—the server doesn't store the session.

77. **Q: Why not use Session/Cookies?**
    *   **A:** JWT allows for easier cross-domain requests and mobile app integration. It decouples the frontend domain from the backend domain more easily than cookie-based sessions.

78. **Q: What information is stored in your Token?**
    *   **A:** Only necessary non-sensitive claims: User ID and Expiration flow. Never passwords.

79. **Q: How do you secure user passwords?**
    *   **A:** We use `bcryptjs`. We **salt** and **hash** the password before saving. Hashing is one-way specific; we cannot retrieve the original password, only verify a match.

80. **Q: Explain the Google OAuth flow logic.**
    *   **A:** 1. Client gets a code from Google. 2. Client sends code to Backend. 3. Backend verifies code with Google servers directly. 4. If valid, Backend checks/creates user in DB and issues our own JWT app token.

81. **Q: What is Middleware Protection?**
    *   **A:** Ideally, `protect.js` runs before sensitive routes. It interrupts the request if the token is missing or expired, returning "401 Unauthorized" before the controller code runs.

82. **Q: Vulnerability: What is XSS and how do you prevent it?**
    *   **A:** Cross-Site Scripting. React prevents this by default by escaping content in JSX. We must be careful not to use `dangerouslySetInnerHTML` with user content (like Sticky Note text).

83. **Q: Vulnerability: What is NoSQL Injection?**
    *   **A:** Similar to SQL injection, passing objects like `{"$gt": ""}` instead of strings into queries to bypass login. Mongoose sanitization and explicit casting usually prevent this.

84. **Q: How do you handle "Guest" security?**
    *   **A:** Guests access via Obscure URLs (Tokens). Security relies on the complexity of the UUID in the URL. If the URL leaks, the security is compromised. We limit guest permissions (e.g., they can't delete the meeting).

85. **Q: What is CORS policy?**
    *   **A:** Browser mechanism restricting web pages from making requests to a different domain than the one that served the web page. We configured our Express server to `Access-Control-Allow-Origin` for our frontend domain.

---

## 🤖 AI & Features

86. **Q: How is Google Gemini integrated?**
    *   **A:** We use the `@google/generative-ai` SDK. We send a text prompt (context of the board) to the API, and it returns a generated text response.

87. **Q: How does image generation work (Pollinations.ai)?**
    *   **A:** We detect keywords ("draw a cat"). We construct a URL `pollinations.ai/p/{prompt}`. We proxy this request through our server to fetch the binary image data and serve it to the canvas to bypass CORS restrictions on the canvas `toDataURL` ("Tainted Canvas" issue).

88. **Q: What is the "Context" you send to the AI?**
    *   **A:** We extract the text from all Sticky Notes and Text items on the board. We combine this into a system prompt: "Here is the current board context: [List of notes]. Answer the user's question based on this."

89. **Q: What is a "Tainted Canvas"?**
    *   **A:** If you draw an image from a different domain (Pollinations) onto an HTML5 Canvas without proper CORS headers, the browser "taints" the canvas for security, blocking you from reading data back (Export as JPG fails). We solve this by proxying the image.

90. **Q: How does the formatting in the AI response work?**
    *   **A:** The AI returns Markdown. We use a unified Markdown parser on the frontend to render lists, bold text, and headers inside the chat bubble.

---

## 🚀 DevOps & Testing

91. **Q: How would you deploy this application?**
    *   **A:** Frontend: Build (`npm run build`) to static files, host on Vercel/Netlify. Backend: Host on Render/Heroku/AWS EC2. MongoDB: Use MongoDB Atlas (Cloud). configure environment variables on all platforms.

92. **Q: What is the purpose of Docker here?**
    *   **A:** Docker containerizes the app. It bundles the code + Node.js runtime + OS libraries. It ensures "It works on my machine" means it works everywhere.

93. **Q: How does the `docker-compose.yml` work?**
    *   **A:** It orchestrates multi-container applications. It can spin up the Frontend container, Backend container, and a local MongoDB instance in one network with a single command (`docker-compose up`).

94. **Q: What are unit tests vs integration tests?**
    *   **A:** Unit tests check individual functions (e.g., "Does this geometric formula return the correct center?"). Integration tests check how modules work together (e.g., "Does hitting the API endpoint result in a DB entry?").

95. **Q: What testing tools would you use?**
    *   **A:** **Vitest/Jest** for logic testing. **React Testing Library** for component testing. **Supertest** for API testing. **Cypress/Playwright** for End-to-End browser automation.

---

## 🧠 Logical Puzzles (Bonus)

96. **Q: If two users draw a line at the exact same millisecond, what happens?**
    *   **A:** Node.js is single-threaded. Events are processed one by one from the event queue. One will be processed effectively "first", then the other. Consistency is maintained by the server's serialization of events.

97. **Q: Why does the eraser sometimes lag more than the brush?**
    *   **A:** In some implementations, erasing requires calculating intersections or redrawing the entire scene without the erased object. In our pixel-based implementation (destination-out), performance should be identical. If we used vector object deletion, it would be computationally heavier.

98. **Q: What is the complexity of searching for a sticky note by ID?**
    *   **A:** On frontend: O(N) where N is number of notes (using Array.find). If N is large, we should use a Map/Object for O(1) lookup.

99. **Q: How do you handle "Undo" in a multiplayer environment?**
    *   **A:** It's tricky. Global Undo undoes the *last action on the stack*, which might be someone else's action. We implement "User-Specific Undo" by tracking which stroke belongs to which User ID and only removing the last action found for *that* user.

100. **Q: If you had 1 more week, what would you add?**
    *   **A:** 1. Pagination/Infinite Scroll for history. 2. OT (Operational Transformation) or CRDTs to allow simultaneous text editing without overwrites. 3. Voice chat using WebRTC.
