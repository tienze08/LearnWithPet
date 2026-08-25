(() => {
  if (window.top !== window || document.getElementById("vocapet-browser-companion")) return;

  const host = document.createElement("div");
  host.id = "vocapet-browser-companion";
  document.documentElement.append(host);

  const spriteUrl = chrome.runtime.getURL("assets/burumaru-9x8.webp");
  let companionVisible = false;
  host.innerHTML = `
    <div class="vocapet-pet-wrap" aria-live="polite">
      <div class="vocapet-bubble to-right" role="dialog" aria-label="VocaPet companion">
        <p class="vocapet-label">BURUMARU</p><h2>I'm here whenever you're ready.</h2>
        <p class="vocapet-copy">A small review can keep your words familiar.</p>
        <div class="vocapet-actions"></div>
      </div>
      <button class="vocapet-pet" type="button" aria-label="Open VocaPet companion"></button>
    </div>`;

  const wrap = host.querySelector(".vocapet-pet-wrap");
  const pet = host.querySelector(".vocapet-pet");
  const bubble = host.querySelector(".vocapet-bubble");
  const title = host.querySelector("h2");
  const copy = host.querySelector(".vocapet-copy");
  const actions = host.querySelector(".vocapet-actions");
  pet.style.setProperty("--sprite-url", `url(${spriteUrl})`);

  let x = 24;
  let direction = 1;
  let frame = 0;
  let lastFrameAt = 0;
  let lastMoveAt = performance.now();
  let paused = false;
  let closeTimer;
  let idleUntil = 0;
  let emoteRow = null;
  let emoteUntil = 0;
  let approachingTarget = null;
  let afterArrival = null;
  let lastActivityAt = Date.now();
  let hoverTimer;

  const send = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
  const setCompanionVisible = (visible) => {
    companionVisible = visible;
    host.style.display = visible ? "block" : "none";
    if (!visible) closeBubble();
  };
  const setSprite = (row, nextFrame) => {
    pet.style.backgroundPosition = `${(nextFrame / 7) * 100}% ${(row / 8) * 100}%`;
  };
  const setBubbleDirection = () => {
    const nearLeft = x < window.innerWidth / 2;
    bubble.classList.toggle("to-right", nearLeft);
    bubble.classList.toggle("to-left", !nearLeft);
  };
  const clearCloseTimer = () => { if (closeTimer) window.clearTimeout(closeTimer); };
  const closeBubble = () => { bubble.classList.remove("open"); paused = false; clearCloseTimer(); };
  const useEmote = (row, duration) => { emoteRow = row; emoteUntil = performance.now() + duration; };
  const pauseFor = (duration) => { paused = true; idleUntil = performance.now() + duration; };
  const showBubble = ({ heading, detail, buttons = [], sticky = false }) => {
    clearCloseTimer(); paused = true; setBubbleDirection(); title.textContent = heading; copy.textContent = detail;
    bubble.querySelector(".vocapet-options")?.remove();
    actions.replaceChildren(...buttons.map(({ label, primary, onClick }) => {
      const button = document.createElement("button"); button.className = `vocapet-action${primary ? " primary" : ""}`; button.textContent = label; button.addEventListener("click", onClick); return button;
    }));
    bubble.classList.add("open");
    if (!sticky) closeTimer = window.setTimeout(closeBubble, 10000);
  };
  const openPlan = () => { send({ type: "OPEN_PLAN" }); closeBubble(); };

  function approachForReminder(callback) {
    clearCloseTimer();
    paused = false;
    approachingTarget = Math.max(12, window.innerWidth - 338);
    afterArrival = callback;
  }

  async function startQuiz() {
    clearCloseTimer();
    bubble.querySelector(".vocapet-options")?.remove();
    title.textContent = "Quick question!"; copy.textContent = "Burumaru is choosing a word…"; actions.replaceChildren(); bubble.classList.add("open");
    const result = await send({ type: "GET_QUIZ" });
    if (!result?.ok) { showBubble({ heading: "Let's review on VocaPet.", detail: result?.error ?? "I couldn't prepare a question right now.", buttons: [{ label: "Open study plan", primary: true, onClick: openPlan }] }); return; }
    const quiz = result.quiz;
    title.textContent = `What does “${quiz.word}” mean?`;
    copy.textContent = quiz.partOfSpeech ? quiz.partOfSpeech.toUpperCase() : "QUICK QUIZ";
    const options = document.createElement("div"); options.className = "vocapet-options";
    quiz.options.forEach((option) => {
      const choice = document.createElement("button"); choice.className = "vocapet-option"; choice.textContent = option;
      choice.addEventListener("click", async () => {
        options.querySelectorAll("button").forEach((item) => { item.disabled = true; });
        const response = await send({ type: "ANSWER_QUIZ", vocabularyId: quiz.vocabularyId, answer: option });
        if (!response?.ok) { showBubble({ heading: "I couldn't check that yet.", detail: response?.error ?? "Please try again in VocaPet.", buttons: [{ label: "Open study plan", primary: true, onClick: openPlan }] }); return; }
        const answer = response.answer;
        choice.classList.add(answer.correct ? "correct" : "wrong");
        title.textContent = answer.correct ? "You got it!" : `It means: ${answer.correctAnswer}`;
        copy.textContent = answer.correct ? `+${answer.xp} XP — great recall!` : "No worries. We'll meet this word again soon.";
        if (answer.correct) { useEmote(4, 1200); pet.classList.add("is-happy"); window.setTimeout(() => pet.classList.remove("is-happy"), 1200); }
        actions.replaceChildren(Object.assign(document.createElement("button"), { className: "vocapet-action primary", textContent: "Continue learning" }));
        actions.firstChild.addEventListener("click", openPlan);
      });
      options.append(choice);
    });
    bubble.append(options);
  }

  function openOverview() {
    showBubble({ heading: "Ready for a small study moment?", detail: "I can bring your due words or ask one quick question.", sticky: true, buttons: [
      { label: "Quick quiz", primary: true, onClick: startQuiz },
      { label: "Today's plan", onClick: openPlan },
      { label: "Close", onClick: closeBubble },
    ] });
  }

  pet.addEventListener("click", (event) => { event.stopPropagation(); openOverview(); });
  pet.addEventListener("pointerenter", () => {
    if (bubble.classList.contains("open") || approachingTarget !== null) return;
    hoverTimer = window.setTimeout(() => {
      useEmote(3, 1100);
      showBubble({ heading: "Hi, I'm still here.", detail: "I'll keep your next review ready while you work." });
    }, 450);
  });
  pet.addEventListener("pointerleave", () => { if (hoverTimer) window.clearTimeout(hoverTimer); });
  document.addEventListener("pointerdown", (event) => { if (!host.contains(event.target)) closeBubble(); });
  window.addEventListener("resize", () => { x = Math.min(x, Math.max(10, window.innerWidth - 118)); setBubbleDirection(); });
  for (const eventName of ["pointerdown", "keydown", "scroll", "focus"]) {
    window.addEventListener(eventName, () => { lastActivityAt = Date.now(); }, { passive: true });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "AUTH_CHANGED") {
      setCompanionVisible(Boolean(message.authenticated));
      return;
    }
    if (message.type !== "SHOW_REMINDER") return;
    if (!companionVisible) return;
    const plan = message.plan;
    approachForReminder(() => showBubble({ heading: "Hey! Quick question?", detail: `${plan.dueCards} word${plan.dueCards === 1 ? " is" : "s are"} ready. A calm ${plan.estimatedMinutes ?? 5}-minute review is waiting.`, sticky: true, buttons: [
      { label: "Ask me", primary: true, onClick: startQuiz },
      { label: "Review", onClick: openPlan },
      { label: "Later", onClick: closeBubble },
    ] }));
  });

  async function greetWhenAppropriate() {
    const result = await send({ type: "CLAIM_INTERACTION", kind: "greeting" });
    if (!result?.allowed || bubble.classList.contains("open")) return;
    useEmote(3, 900);
    showBubble({ heading: "I'm glad you're here.", detail: "Whenever you want a short break, we can review a word together." });
  }

  window.setTimeout(greetWhenAppropriate, 3500);
  window.setInterval(async () => {
    if (document.visibilityState !== "visible" || bubble.classList.contains("open")) return;
    if (Date.now() - lastActivityAt < 1000 * 60 * 4) return;
    const result = await send({ type: "CLAIM_INTERACTION", kind: "focusBreak" });
    if (!result?.allowed) return;
    useEmote(3, 1000);
    showBubble({ heading: "You've been focused for a while.", detail: "Want one gentle question before you continue?", buttons: [
      { label: "Quick quiz", primary: true, onClick: startQuiz },
      { label: "Keep working", onClick: closeBubble },
    ] });
  }, 30000);

  function animate(now) {
    if (!companionVisible) { requestAnimationFrame(animate); return; }
    const elapsed = now - lastMoveAt; lastMoveAt = now;
    if (approachingTarget !== null) {
      const distance = approachingTarget - x;
      const step = Math.sign(distance) * Math.min(Math.abs(distance), elapsed * 0.28);
      x += step;
      direction = distance >= 0 ? 1 : -1;
      wrap.style.transform = `translate3d(${x}px, 0, 0)`;
      if (Math.abs(distance) < 2) {
        const callback = afterArrival;
        approachingTarget = null; afterArrival = null;
        callback?.();
      }
    } else if (!paused && now >= idleUntil) {
      const maxX = Math.max(12, window.innerWidth - 118);
      x += direction * elapsed * 0.045;
      if (x >= maxX) { x = maxX; direction = -1; }
      if (x <= 12) { x = 12; direction = 1; }
      wrap.style.transform = `translate3d(${x}px, 0, 0)`;
      if (now - lastFrameAt > 130) { frame = (frame + 1) % 8; lastFrameAt = now; }
      if (!bubble.classList.contains("open") && Math.random() < 0.0008) idleUntil = now + 1500;
    } else {
      if (!paused && now >= idleUntil) idleUntil = 0;
    }
    const isEmoting = now < emoteUntil && emoteRow !== null;
    const idling = paused || now < idleUntil;
    setSprite(
      isEmoting ? emoteRow : (idling ? 0 : direction > 0 ? 1 : 2),
      isEmoting ? Math.floor(now / 180) % 4 : (idling ? Math.floor(now / 420) % 6 : frame),
    );
    requestAnimationFrame(animate);
  }
  send({ type: "GET_STATE" }).then((result) => setCompanionVisible(Boolean(result?.authenticated)));
  setSprite(1, 0); requestAnimationFrame(animate);
})();
