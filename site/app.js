/* LaunchGrade site — no dependencies, no tracking. */
(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* Sticky header shadow */
  const header = $(".site-head");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile navigation */
  const toggle = $(".nav-toggle");
  const links = $("#nav-links");
  if (toggle && links) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      links.dataset.open = String(open);
    };
    setOpen(false);
    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    links.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav")) setOpen(false);
    });
  }

  /* Copy buttons */
  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } finally {
      area.remove();
    }
  };

  $$(".copy").forEach((button) => {
    const original = button.textContent;
    button.addEventListener("click", async () => {
      const target = button.dataset.copy ? $(button.dataset.copy) : null;
      const text = button.dataset.copyText || (target ? target.textContent.trim() : "");
      if (!text) return;
      try {
        await copyText(text);
        button.textContent = "Copied";
        button.classList.add("copied");
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove("copied");
        }, 1800);
      } catch {
        button.textContent = "Select and copy";
      }
    });
  });

  /* Footer year */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* Close details when another opens (keeps the FAQ tidy) */
  const details = $$(".faq details");
  details.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      details.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* Audit form — FormSubmit AJAX, with a mailto fallback */
  const form = $("#audit-form");
  const status = $("#form-status");
  if (!form || !status) return;

  const submit = $(".submit", form);
  const label = $(".submit-label", form);
  const endpoint = form.dataset.ajax || form.action;
  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("error", isError);
  };

  // If FormSubmit redirected back after a no-JS submission, say thanks.
  if (new URLSearchParams(window.location.search).get("sent") === "1") {
    setStatus("Request received. A human will reply to your email.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("Add your email and a short note so we can reply.", true);
      return;
    }

    const data = new FormData(form);
    if (String(data.get("_honey") || "").trim()) return;

    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    if (label) label.textContent = "Sending…";
    setStatus("Sending your request…");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        /* FormSubmit occasionally returns plain text. */
      }
      const failed = !response.ok || payload?.success === "false" || payload?.success === false;
      if (failed) throw new Error(payload?.message || `HTTP ${response.status}`);

      form.reset();
      setStatus("Got it. A human will reply — usually within a few days. Check your inbox.");
      if (label) label.textContent = "Sent";
      window.setTimeout(() => {
        if (label) label.textContent = "Send request";
      }, 5000);
    } catch (error) {
      const subject = encodeURIComponent("LaunchGrade — audit or collab request");
      const body = encodeURIComponent(
        `Email: ${email}\n\n${message}`
      );
      status.innerHTML = "";
      const text = document.createTextNode("Could not send automatically. ");
      const link = document.createElement("a");
      link.href = `mailto:meetcode99@gmail.com?subject=${subject}&body=${body}`;
      link.textContent = "Email us directly instead";
      link.style.color = "inherit";
      link.style.textDecoration = "underline";
      status.append(text, link, document.createTextNode("."));
      status.classList.add("error");
      if (label) label.textContent = "Send request";
      console.warn("LaunchGrade form error:", error);
    } finally {
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
    }
  });
})();
