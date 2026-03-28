'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

const state = {
	activeSection: 0,
	barsAnimated: false,
	launchTriggered: false,
	edlTriggered: false,
	finaleTriggered: false,
	labInitialized: false,
	tourRunning: false,
	tourTimer: null,
	soundOn: false,
	audioCtx: null,
	masterGain: null,
	orbitFrame: null,
	landingFrame: null,
	telemetryFrames: null,
	telemetryValues: {
		fuel: 87.3,
		power: 94.1,
		comms: 92.7,
		integrity: 99.8,
	},
	crewBiometrics: {
		crew0: { heart: 72, o2: 98, stress: 'LOW' },
		crew1: { heart: 68, o2: 99, stress: 'CALM' },
		crew2: { heart: 70, o2: 98, stress: 'ENGAGED' },
		crew3: { heart: 71, o2: 97, stress: 'READY' },
	},
	prelaunchChecks: { pressure: false, battery: false, pattern: false, confirmed: false },
	crisisEvents: [],
	missionChoices: [],
	missionSuccess: 87.4,
	missionData: {},
	missionReplay: [],
	replayIndex: 0,
	replayTimer: null,
	replayMilestones: {},
};

const sectionSelectors = [
	'#s-hero',
	'#s-crew',
	'#s-launch',
	'#s-space',
	'#s-approach',
	'#s-control',
	'#s-landing',
	'#s-explore',
	'#s-lab',
	'#s-results',
];

const sectionNames = [
	'Hero Briefing',
	'Crew Briefing',
	'Launch Operations',
	'Deep Space Transit',
	'Mars Approach',
	'Mission Control',
	'Landing Sequence',
	'Surface Exploration',
	'Mission Lab',
	'Final Results',
];

const missionStartMs = Date.now();

function formatReplayStamp(ms) {
	const elapsed = Math.max(0, Math.floor((ms - missionStartMs) / 1000));
	const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
	const sec = (elapsed % 60).toString().padStart(2, '0');
	return `T+${min}:${sec}`;
}

function chapterLabel(idx) {
	return sectionNames[idx] || 'Mission Event';
}

function stopReplayAutoplay() {
	if (!state.replayTimer) return;
	window.clearInterval(state.replayTimer);
	state.replayTimer = null;
	const playBtn = $('#replayPlay');
	if (playBtn) playBtn.textContent = 'AUTO PLAY';
}

function renderReplayEvent(index) {
	const events = state.missionReplay;
	if (!events.length) return;

	const bounded = clamp(index, 0, events.length - 1);
	state.replayIndex = bounded;
	const evt = events[bounded];

	const title = $('#replayTitle');
	const stamp = $('#replayTimestamp');
	const detail = $('#replayDetail');
	const idxEl = $('#replayIndex');
	const totalEl = $('#replayTotal');
	const scrubber = $('#replayScrubber');

	if (title) title.textContent = evt.title;
	if (stamp) stamp.textContent = `${evt.stamp} • ${evt.chapter}`;
	if (detail) detail.textContent = evt.detail;
	if (idxEl) idxEl.textContent = `Event ${bounded + 1}`;
	if (totalEl) totalEl.textContent = `${events.length} events`;
	if (scrubber) scrubber.value = String(bounded);

	$$('.replay-chip').forEach((chip, chipIdx) => {
		chip.classList.toggle('active', chipIdx === bounded);
	});
}

function rebuildReplayTimeline() {
	const events = state.missionReplay;
	const scrubber = $('#replayScrubber');
	const list = $('#replayEvents');
	const idxEl = $('#replayIndex');
	const totalEl = $('#replayTotal');

	if (scrubber) {
		scrubber.max = String(Math.max(0, events.length - 1));
		scrubber.value = String(clamp(state.replayIndex, 0, Math.max(0, events.length - 1)));
	}

	if (totalEl) totalEl.textContent = `${events.length} events`;
	if (!events.length) {
		if (idxEl) idxEl.textContent = 'Event 0';
		return;
	}

	if (list) {
		list.innerHTML = events.map((evt, i) => (
			`<button class="replay-chip${i === state.replayIndex ? ' active' : ''}" data-index="${i}" type="button">${evt.short}</button>`
		)).join('');

		$$('.replay-chip', list).forEach((chip) => {
			chip.addEventListener('click', () => {
				stopReplayAutoplay();
				renderReplayEvent(Number(chip.dataset.index || 0));
			});
		});
	}

	renderReplayEvent(state.replayIndex);
}

function recordReplayEvent(title, detail, idx = state.activeSection) {
	const event = {
		title,
		detail,
		chapter: chapterLabel(idx),
		stamp: formatReplayStamp(Date.now()),
		short: title.length > 22 ? `${title.slice(0, 22)}...` : title,
	};

	state.missionReplay.push(event);
	if (state.missionReplay.length > 28) state.missionReplay.shift();
	state.replayIndex = Math.max(0, state.missionReplay.length - 1);
	rebuildReplayTimeline();
}

function initMissionReplay() {
	const scrubber = $('#replayScrubber');
	const prevBtn = $('#replayPrev');
	const nextBtn = $('#replayNext');
	const playBtn = $('#replayPlay');
	if (!scrubber || !prevBtn || !nextBtn || !playBtn) return;

	scrubber.addEventListener('input', (e) => {
		stopReplayAutoplay();
		renderReplayEvent(Number(e.target.value || 0));
	});

	prevBtn.addEventListener('click', () => {
		stopReplayAutoplay();
		renderReplayEvent(state.replayIndex - 1);
	});

	nextBtn.addEventListener('click', () => {
		stopReplayAutoplay();
		renderReplayEvent(state.replayIndex + 1);
	});

	playBtn.addEventListener('click', () => {
		if (state.replayTimer) {
			stopReplayAutoplay();
			return;
		}

		if (!state.missionReplay.length) return;
		playBtn.textContent = 'PAUSE';
		state.replayTimer = window.setInterval(() => {
			if (state.replayIndex >= state.missionReplay.length - 1) {
				stopReplayAutoplay();
				return;
			}
			renderReplayEvent(state.replayIndex + 1);
		}, 1400);
	});

	rebuildReplayTimeline();
	recordReplayEvent('Mission Initialized', 'All systems booted. Crew awaiting launch clearance.', 0);
}

function initLoader() {
	const bar = $('#loaderBar');
	const counter = $('#loaderCounter');
	const checks = $$('.chk-item');
	const loader = $('#loader');
	if (!bar || !counter || !loader) return;

	let progress = 0;
	const tick = window.setInterval(() => {
		progress = Math.min(100, progress + Math.random() * 8 + 2);
		bar.style.width = progress.toFixed(0) + '%';
		counter.textContent = progress.toFixed(0) + '%';

		if (progress >= 100) {
			window.clearInterval(tick);
			window.setTimeout(() => loader.classList.add('hidden'), 380);
			window.setTimeout(() => $('#space-canvas')?.classList.add('visible'), 420);
		}
	}, 55);

	checks.forEach((item) => {
		const delay = Number(item.dataset.delay || 0);
		window.setTimeout(() => item.classList.add('show'), delay);
	});
}

function initCursor() {
	if (window.matchMedia('(pointer: coarse)').matches) return;
	const dot = $('#cursor-dot');
	const ring = $('#cursor-ring');
	if (!dot || !ring) return;

	let mouseX = window.innerWidth / 2;
	let mouseY = window.innerHeight / 2;
	let ringX = mouseX;
	let ringY = mouseY;

	document.addEventListener('mousemove', (event) => {
		mouseX = event.clientX;
		mouseY = event.clientY;
		dot.style.left = mouseX + 'px';
		dot.style.top = mouseY + 'px';
	});

	const animate = () => {
		ringX = lerp(ringX, mouseX, 0.14);
		ringY = lerp(ringY, mouseY, 0.14);
		ring.style.left = ringX + 'px';
		ring.style.top = ringY + 'px';
		window.requestAnimationFrame(animate);
	};
	animate();

	document.addEventListener('mouseleave', () => {
		dot.style.opacity = '0';
		ring.style.opacity = '0';
	});
	document.addEventListener('mouseenter', () => {
		dot.style.opacity = '1';
		ring.style.opacity = '1';
	});
}

function initStarfield() {
	const canvas = $('#space-canvas');
	if (!canvas) return;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	let width = 0;
	let height = 0;
	let stars = [];

	const buildStars = () => {
		stars = [];
		const count = Math.floor((width * height) / 9000);
		for (let i = 0; i < count; i += 1) {
			stars.push({
				x: Math.random() * width,
				y: Math.random() * height,
				size: Math.random() * 1.8 + 0.4,
				twinkle: Math.random() * Math.PI * 2,
				speed: Math.random() * 0.5 + 0.15,
			});
		}
	};

	const resize = () => {
		width = canvas.width = window.innerWidth;
		height = canvas.height = window.innerHeight;
		buildStars();
	};
	window.addEventListener('resize', resize);
	resize();

	let t = 0;
	const draw = () => {
		t += 0.01;
		ctx.clearRect(0, 0, width, height);

		const g = ctx.createLinearGradient(0, 0, 0, height);
		g.addColorStop(0, 'rgba(2,3,10,0.96)');
		g.addColorStop(1, 'rgba(8,10,22,0.96)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, width, height);

		const depth = clamp(window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight), 0, 1);

		stars.forEach((star) => {
			const alpha = 0.3 + (Math.sin(t + star.twinkle) + 1) * 0.25;
			const y = (star.y + depth * 100 * star.speed) % height;
			ctx.beginPath();
			ctx.arc(star.x, y, star.size, 0, Math.PI * 2);
			ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
			ctx.fill();
		});

		if (depth > 0.55) {
			const mg = ctx.createRadialGradient(width * 0.6, height * 0.5, 0, width * 0.6, height * 0.5, width * 0.5);
			mg.addColorStop(0, 'rgba(193,68,14,0.16)');
			mg.addColorStop(1, 'transparent');
			ctx.fillStyle = mg;
			ctx.fillRect(0, 0, width, height);
		}

		window.requestAnimationFrame(draw);
	};

	draw();
}

function animateCounter(el, target, duration = 1800) {
	const start = performance.now();
	const run = (now) => {
		const p = clamp((now - start) / duration, 0, 1);
		const eased = 1 - Math.pow(1 - p, 3);
		el.textContent = String(Math.round(target * eased));
		if (p < 1) window.requestAnimationFrame(run);
	};
	window.requestAnimationFrame(run);
}

function initHeroCounters() {
	const counters = $$('.hstat-n');
	if (!counters.length) return;

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (!entry.isIntersecting) return;
			const target = Number(entry.target.dataset.target || 0);
			animateCounter(entry.target, target);
			observer.unobserve(entry.target);
		});
	}, { threshold: 0.5 });

	counters.forEach((el) => observer.observe(el));
}

function initScrollReveal() {
	const revealItems = $$('.reveal-item');
	const revealObs = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) entry.target.classList.add('visible');
		});
	}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

	revealItems.forEach((item) => revealObs.observe(item));

	const sections = $$('.chapter');
	const navDots = $$('.nav-dot');
	let currentSection = -1;
	const sectionObs = new IntersectionObserver((entries) => {
		const visible = entries
			.filter((entry) => entry.isIntersecting)
			.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
		if (!visible) return;

		const idx = sections.indexOf(visible.target);
		if (idx < 0 || idx === currentSection) return;

		currentSection = idx;
		state.activeSection = idx;
		navDots.forEach((dot, dotIdx) => dot.classList.toggle('active', dotIdx === idx));
		onSectionEnter(idx);
	}, {
		threshold: [0.2, 0.35, 0.5, 0.65],
		rootMargin: '-12% 0px -12% 0px',
	});

	sections.forEach((section) => sectionObs.observe(section));
}

function initHUD() {
	const hudProgress = $('#hudProgress');
	const hudProgressPct = $('#hudProgressPct');
	const hudDay = $('#hudDay');
	const hudVelocity = $('#hudVelocity');
	const stages = $$('.hud-stage');

	if (!hudProgress || !hudProgressPct || !hudDay || !hudVelocity) return;

	const sectionMissionDays = [0, 1, 47, 150, 203, 207, 220];
	const sectionVelocities = [0, 7.8, 28, 22, 2.4, 0.1, 0.05];

	const update = () => {
		const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
		const pct = clamp(window.scrollY / maxScroll, 0, 1);
		hudProgress.style.width = (pct * 100).toFixed(1) + '%';
		hudProgressPct.textContent = Math.round(pct * 100) + '%';

		const segment = pct * (sectionMissionDays.length - 1);
		const idx = Math.floor(segment);
		const next = Math.min(sectionMissionDays.length - 1, idx + 1);
		const frac = segment - idx;

		const day = Math.round(lerp(sectionMissionDays[idx], sectionMissionDays[next], frac));
		const vel = lerp(sectionVelocities[idx], sectionVelocities[next], frac);

		hudDay.textContent = String(day).padStart(3, '0');
		hudVelocity.textContent = vel.toFixed(1);
		stages.forEach((stage, i) => stage.classList.toggle('active', i === state.activeSection));
	};

	window.addEventListener('scroll', update, { passive: true });
	update();
}

function initNavigation() {
	$$('.nav-dot, .cta-btn[href]').forEach((anchor) => {
		anchor.addEventListener('click', (event) => {
			const href = anchor.getAttribute('href');
			if (!href || !href.startsWith('#')) return;
			const target = $(href);
			if (!target) return;
			event.preventDefault();
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	});
}

function initKeyboardNav() {
	document.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowDown' || event.key === 'PageDown') {
			event.preventDefault();
			const next = Math.min(sectionSelectors.length - 1, state.activeSection + 1);
			$(sectionSelectors[next])?.scrollIntoView({ behavior: 'smooth' });
		}
		if (event.key === 'ArrowUp' || event.key === 'PageUp') {
			event.preventDefault();
			const prev = Math.max(0, state.activeSection - 1);
			$(sectionSelectors[prev])?.scrollIntoView({ behavior: 'smooth' });
		}
	});
}

function initDiscoveryCards() {
	const cards = $$('.disc-card');
	cards.forEach((card) => {
		const toggle = () => {
			const isOpen = card.classList.contains('expanded');
			cards.forEach((item) => item.classList.remove('expanded'));
			if (!isOpen) card.classList.add('expanded');
		};

		card.addEventListener('click', toggle);
		card.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				toggle();
			}
		});
	});
}

function triggerLaunch() {
	if (state.launchTriggered) return;
	state.launchTriggered = true;
	recordReplayEvent('Launch Countdown', 'Launch sequence has started. Ignition in T-3.', 2);

	const overlay = $('#countdownOverlay');
	const number = $('#countdownNum');
	const rocket = $('#rocketWrap');
	const shockwave = $('#shockwave');
	const puffs = $$('.ec-puff');

	if (!overlay || !number || !rocket) return;

	overlay.style.opacity = '1';
	let count = 3;
	const countdown = () => {
		number.textContent = String(count);
		number.style.animation = 'none';
		number.offsetHeight;
		number.style.animation = 'countdownAnim 1s ease forwards';
		count -= 1;

		if (count >= 0) {
			window.setTimeout(countdown, 1000);
			return;
		}

		number.textContent = 'IGNITION';
		window.setTimeout(() => {
			overlay.style.opacity = '0';
			shockwave?.classList.add('active');
			rocket.classList.add('launching');
			puffs.forEach((puff) => puff.classList.add('visible'));
			recordReplayEvent('Liftoff', 'Ares-I has cleared the tower and entered ascent trajectory.', 2);
			if (state.soundOn) playRocketSound();
			window.setTimeout(() => shockwave?.classList.remove('active'), 3200);
		}, 400);
	};

	window.setTimeout(countdown, 450);
}

function initOrbitCanvas() {
	const canvas = $('#orbitCanvas');
	if (!canvas || canvas.dataset.ready === '1') return;
	canvas.dataset.ready = '1';

	const ctx = canvas.getContext('2d');
	const cX = canvas.width / 2;
	const cY = canvas.height / 2;
	let tick = 0;

	const draw = () => {
		tick += 1;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		ctx.strokeStyle = 'rgba(100,180,255,0.2)';
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.arc(cX, cY, 80, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(255,119,51,0.18)';
		ctx.setLineDash([7, 8]);
		ctx.beginPath();
		ctx.arc(cX, cY, 130, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		const earthA = tick * 0.01;
		const marsA = tick * 0.006 + 1.6;

		const ex = cX + Math.cos(earthA) * 80;
		const ey = cY + Math.sin(earthA) * 80;
		const mx = cX + Math.cos(marsA) * 130;
		const my = cY + Math.sin(marsA) * 130;

		ctx.fillStyle = '#00aaff';
		ctx.beginPath();
		ctx.arc(ex, ey, 6, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#ff7733';
		ctx.beginPath();
		ctx.arc(mx, my, 6, 0, Math.PI * 2);
		ctx.fill();

		const ax = lerp(ex, mx, 0.47);
		const ay = lerp(ey, my, 0.47) - 22;
		ctx.fillStyle = '#00ff88';
		ctx.beginPath();
		ctx.arc(ax, ay, 4.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,0.85)';
		ctx.font = '10px "JetBrains Mono", monospace';
		ctx.fillText('EARTH', ex - 18, ey - 12);
		ctx.fillText('MARS', mx - 14, my - 12);
		ctx.fillText('ARES-I', ax - 18, ay - 10);

		state.orbitFrame = window.requestAnimationFrame(draw);
	};

	draw();
}

function initLandingCanvas() {
	const canvas = $('#landingCanvas');
	if (!canvas || canvas.dataset.ready === '1') return;
	canvas.dataset.ready = '1';

	const ctx = canvas.getContext('2d');
	let t = 0;

	const draw = () => {
		t += 1;
		const progress = clamp(t / 380, 0, 1);
		const y = lerp(35, 240, progress);

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
		sky.addColorStop(0, '#05081b');
		sky.addColorStop(1, '#4c1b0b');
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = '#8b3a1a';
		ctx.fillRect(0, 275, canvas.width, 80);

		ctx.save();
		ctx.translate(canvas.width / 2, y);
		ctx.fillStyle = '#d9e5f2';
		ctx.fillRect(-18, -16, 36, 40);
		ctx.fillStyle = '#112233';
		ctx.beginPath();
		ctx.arc(0, -2, 7, 0, Math.PI * 2);
		ctx.fill();

		if (progress > 0.55 && progress < 0.95) {
			const flame = 18 + Math.sin(t * 0.4) * 4;
			ctx.fillStyle = 'rgba(255,120,30,0.75)';
			ctx.beginPath();
			ctx.moveTo(-7, 24);
			ctx.lineTo(0, 24 + flame);
			ctx.lineTo(7, 24);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();

		const alt = Math.round(lerp(2400, 0, progress));
		const vel = Math.round(lerp(280, 0, Math.pow(progress, 0.65)));
		const status = progress >= 1 ? 'LANDED' : 'NOMINAL';

		$('#ltAlt').textContent = progress >= 1 ? 'SURFACE' : alt + ' m';
		$('#ltVel').textContent = vel + ' m/s';
		$('#ltStatus').textContent = status;
		$('#ltStatus').style.color = progress >= 1 ? '#ff7733' : '#00ff88';

		state.landingFrame = window.requestAnimationFrame(draw);
	};

	draw();

	$('#edlReplayBtn')?.addEventListener('click', () => {
		t = 0;
	});
}

function triggerBars() {
	if (state.barsAnimated) return;
	state.barsAnimated = true;
	window.setTimeout(() => {
		$$('.pc-bar').forEach((bar) => bar.classList.add('animated'));
	}, 260);
}

function triggerEDL() {
	if (state.edlTriggered) return;
	state.edlTriggered = true;

	const steps = $$('.edl-item');
	let idx = 0;

	const advance = () => {
		steps.forEach((step, stepIdx) => {
			step.classList.toggle('active', stepIdx === idx);
			if (stepIdx < idx) step.style.opacity = '0.72';
		});

		idx += 1;
		if (idx < steps.length) {
			window.setTimeout(advance, 1600);
			return;
		}

		recordReplayEvent('Landing Complete', 'Entry, descent, and landing finished with nominal telemetry.', 6);
	};

	advance();
}

function triggerFinalCounters() {
	if (state.finaleTriggered) return;
	state.finaleTriggered = true;

	$$('.fs-num').forEach((el) => {
		const target = Number(el.dataset.target || 0);
		animateCounter(el, target, 2100);
	});
}

function initParallax() {
	window.addEventListener('scroll', () => {
		const sy = window.scrollY;
		const earth = $('#earthSphere');
		if (earth) earth.style.transform = 'translateY(' + (sy * 0.06).toFixed(1) + 'px)';

		const floating = $('#floatingEarth');
		if (floating?.parentElement) {
			const rect = floating.parentElement.getBoundingClientRect();
			floating.style.transform = 'translateY(' + (-rect.top * 0.04).toFixed(1) + 'px) rotate(-5deg)';
		}
	}, { passive: true });
}

function initApproachTimer() {
	const timerEl = $('.ads-item .ads-val2.blink-green');
	if (!timerEl) return;

	let h = 47;
	let m = 23;
	let s = 8;

	const tick = () => {
		s -= 1;
		if (s < 0) {
			s = 59;
			m -= 1;
		}
		if (m < 0) {
			m = 59;
			h -= 1;
		}
		if (h < 0) {
			h = 0;
			m = 0;
			s = 0;
		}
		const fmt = (n) => String(n).padStart(2, '0');
		timerEl.textContent = 'T-' + fmt(h) + ':' + fmt(m) + ':' + fmt(s);
	};

	window.setInterval(tick, 1000);
}

function initSectionProgress() {
	const distEl = $('#adsDistance');
	if (!distEl) return;

	let distance = 48000;
	window.setInterval(() => {
		distance -= 110 + Math.floor(Math.random() * 40);
		if (distance <= 0) distance = 48000;
		distEl.textContent = distance.toLocaleString();
	}, 70);
}

function initAudio() {
	const button = $('#soundToggle');
	const icon = $('#soundIcon');
	if (!button || !icon) return;

	button.addEventListener('click', () => {
		if (!state.audioCtx) {
			state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			state.masterGain = state.audioCtx.createGain();
			state.masterGain.gain.value = 0;
			state.masterGain.connect(state.audioCtx.destination);

			const oscA = state.audioCtx.createOscillator();
			const oscB = state.audioCtx.createOscillator();
			const oscGain = state.audioCtx.createGain();
			oscA.type = 'sine';
			oscB.type = 'triangle';
			oscA.frequency.value = 48;
			oscB.frequency.value = 96;
			oscGain.gain.value = 0.16;
			oscA.connect(oscGain);
			oscB.connect(oscGain);
			oscGain.connect(state.masterGain);
			oscA.start();
			oscB.start();
		}

		state.soundOn = !state.soundOn;
		if (state.soundOn) {
			state.audioCtx.resume();
			state.masterGain.gain.setTargetAtTime(0.1, state.audioCtx.currentTime, 0.4);
			button.classList.add('active');
			icon.textContent = 'ON';
		} else {
			state.masterGain.gain.setTargetAtTime(0, state.audioCtx.currentTime, 0.4);
			button.classList.remove('active');
			icon.textContent = 'OFF';
		}
	});
}

function playRocketSound() {
	if (!state.audioCtx || !state.masterGain) return;

	const burst = state.audioCtx.createOscillator();
	const gain = state.audioCtx.createGain();
	burst.type = 'sawtooth';
	burst.frequency.setValueAtTime(70, state.audioCtx.currentTime);
	burst.frequency.exponentialRampToValueAtTime(140, state.audioCtx.currentTime + 1.8);

	gain.gain.setValueAtTime(0.001, state.audioCtx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.3, state.audioCtx.currentTime + 0.2);
	gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 2.2);

	burst.connect(gain);
	gain.connect(state.masterGain);
	burst.start();
	burst.stop(state.audioCtx.currentTime + 2.2);
}

function initMissionLab() {
	const controls = {
		window: $('#labWindow'),
		fuel: $('#labFuel'),
		shield: $('#labShield'),
		crew: $('#labCrewLoad'),
	};

	if (!controls.window || !controls.fuel || !controls.shield || !controls.crew) return;
	if (state.labInitialized) return;
	state.labInitialized = true;

	const outputs = {
		window: $('#labWindowVal'),
		fuel: $('#labFuelVal'),
		shield: $('#labShieldVal'),
		crew: $('#labCrewLoadVal'),
		eta: $('#labEta'),
		success: $('#labSuccess'),
		science: $('#labScience'),
		risk: $('#labRisk'),
	};

	const canvas = $('#labTrajectoryCanvas');
	const ctx = canvas?.getContext('2d');

	const readValues = () => ({
		window: Number(controls.window.value),
		fuel: Number(controls.fuel.value),
		shield: Number(controls.shield.value),
		crew: Number(controls.crew.value),
	});

	const model = (params) => {
		const eta = Math.round(238 - params.window * 0.4 - params.fuel * 0.25 + params.crew * 0.2);
		const successRaw = 30 + params.window * 0.38 + params.fuel * 0.34 + params.shield * 0.24 - params.crew * 0.2;
		const success = clamp(successRaw, 4, 99.6);
		const science = clamp(3.6 + params.window * 0.036 + params.fuel * 0.03 + params.shield * 0.02 - params.crew * 0.018, 1, 10);
		const strain = params.crew - params.shield * 0.45 - params.fuel * 0.18;

		let risk = 'LOW';
		if (strain > 30 || success < 68) risk = 'CRITICAL';
		else if (strain > 12 || success < 80) risk = 'MEDIUM';

		return { eta, success, science, risk };
	};

	const drawTrajectory = (params) => {
		if (!ctx || !canvas) return;
		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);

		const bg = ctx.createLinearGradient(0, 0, 0, h);
		bg.addColorStop(0, '#030713');
		bg.addColorStop(1, '#0c1022');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, w, h);

		for (let i = 0; i < 60; i += 1) {
			const x = (i * 83) % w;
			const y = (i * 137) % h;
			ctx.fillStyle = 'rgba(255,255,255,0.35)';
			ctx.fillRect(x, y, 1.2, 1.2);
		}

		const startX = 60;
		const startY = h - 70;
		const endX = w - 70;
		const endY = 70;
		const curvature = clamp((params.window + params.shield - params.crew) * 0.7, 35, 165);

		ctx.strokeStyle = 'rgba(0,180,255,0.35)';
		ctx.lineWidth = 1;
		ctx.setLineDash([6, 8]);
		ctx.beginPath();
		ctx.moveTo(startX, startY);
		ctx.quadraticCurveTo(w * 0.45, h - curvature, endX, endY);
		ctx.stroke();
		ctx.setLineDash([]);

		const glow = ctx.createLinearGradient(startX, startY, endX, endY);
		glow.addColorStop(0, 'rgba(0,170,255,0.9)');
		glow.addColorStop(1, 'rgba(255,119,51,0.9)');
		ctx.strokeStyle = glow;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(startX, startY);
		ctx.quadraticCurveTo(w * 0.45, h - curvature, endX, endY);
		ctx.stroke();

		const progress = clamp((params.window + params.fuel) / 160, 0.12, 0.92);
		const t = progress;
		const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * (w * 0.45) + t * t * endX;
		const py = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * (h - curvature) + t * t * endY;

		ctx.beginPath();
		ctx.arc(startX, startY, 9, 0, Math.PI * 2);
		ctx.fillStyle = '#00aaff';
		ctx.fill();

		ctx.beginPath();
		ctx.arc(endX, endY, 11, 0, Math.PI * 2);
		ctx.fillStyle = '#ff7733';
		ctx.fill();

		ctx.beginPath();
		ctx.arc(px, py, 5, 0, Math.PI * 2);
		ctx.fillStyle = '#00ff88';
		ctx.fill();

		ctx.font = '11px "JetBrains Mono", monospace';
		ctx.fillStyle = 'rgba(255,255,255,0.8)';
		ctx.fillText('EARTH', startX - 22, startY + 22);
		ctx.fillText('MARS', endX - 16, endY - 16);
		ctx.fillText('ARES-I', px - 20, py - 10);
	};

	const update = () => {
		const params = readValues();
		outputs.window.textContent = params.window + '%';
		outputs.fuel.textContent = params.fuel + '%';
		outputs.shield.textContent = params.shield + '%';
		outputs.crew.textContent = params.crew + '%';

		const res = model(params);
		outputs.eta.textContent = res.eta + ' days';
		outputs.success.textContent = res.success.toFixed(1) + '%';
		outputs.science.textContent = res.science.toFixed(1) + ' / 10';
		outputs.risk.textContent = res.risk;
		outputs.risk.style.color = res.risk === 'LOW' ? '#00ff88' : (res.risk === 'MEDIUM' ? '#ffaa00' : '#ff3344');

		drawTrajectory(params);
	};

	Object.values(controls).forEach((input) => input.addEventListener('input', update));

	$('#labRunBtn')?.addEventListener('click', () => {
		const params = readValues();
		let successCount = 0;

		for (let i = 0; i < 10000; i += 1) {
			const varied = {
				window: clamp(params.window + (Math.random() - 0.5) * 12, 0, 100),
				fuel: clamp(params.fuel + (Math.random() - 0.5) * 10, 0, 100),
				shield: clamp(params.shield + (Math.random() - 0.5) * 14, 0, 100),
				crew: clamp(params.crew + (Math.random() - 0.5) * 16, 0, 100),
			};
			const run = model(varied);
			const pass = run.success > 74 && run.risk !== 'CRITICAL';
			if (pass) successCount += 1;
		}

		const probability = (successCount / 10000) * 100;
		outputs.success.textContent = probability.toFixed(1) + '%';
		outputs.success.style.color = probability >= 80 ? '#00ff88' : (probability >= 65 ? '#ffaa00' : '#ff3344');
		recordReplayEvent('Lab Simulation', `Ran 10,000 scenarios. Predicted success ${probability.toFixed(1)}%.`, 8);
	});

	update();
}

function clearFocusHighlights() {
	$$('.chapter').forEach((section) => section.classList.remove('focus-highlight'));
}

function stopGuidedTour() {
	state.tourRunning = false;
	if (state.tourTimer) {
		window.clearTimeout(state.tourTimer);
		state.tourTimer = null;
	}
	document.body.classList.remove('tour-running');
	$('#tourOverlay')?.classList.remove('visible');
	$('#tourToggle')?.classList.remove('active');
	clearFocusHighlights();
}

function startGuidedTour() {
	if (state.tourRunning) {
		stopGuidedTour();
		return;
	}

	const steps = [
		{ sel: '#s-hero', title: 'Opening Mission Brief', body: 'Introduce the narrative arc and the stakes in under 12 seconds.', dwell: 8000 },
		{ sel: '#s-launch', title: 'Launch Spectacle', body: 'Show kinetic motion design and engineering storytelling.', dwell: 13000 },
		{ sel: '#s-space', title: 'Data-driven Deep Space', body: 'Highlight technical visualizations and contextual science facts.', dwell: 13000 },
		{ sel: '#s-approach', title: 'Approach Intelligence', body: 'Demonstrate mission timeline logic and landmark overlays.', dwell: 13000 },
		{ sel: '#s-landing', title: 'Landing Simulation', body: 'Walk judges through telemetry and event-driven sequencing.', dwell: 13000 },
		{ sel: '#s-explore', title: 'Outcome and Discoveries', body: 'Bring emotional payoff and mission relevance together.', dwell: 12000 },
		{ sel: '#s-lab', title: 'Mission Strategy Lab', body: 'Finish with live simulation, Monte Carlo confidence, and decisions.', dwell: 14000 },
	];

	state.tourRunning = true;
	document.body.classList.add('tour-running');
	$('#tourOverlay')?.classList.add('visible');
	$('#tourToggle')?.classList.add('active');

	let idx = 0;
	const runStep = () => {
		if (!state.tourRunning) return;
		const step = steps[idx];
		if (!step) {
			stopGuidedTour();
			return;
		}

		const target = $(step.sel);
		if (target) {
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			clearFocusHighlights();
			target.classList.add('focus-highlight');
		}

		$('#tourStepLabel').textContent = 'Segment ' + (idx + 1) + ' / ' + steps.length;
		$('#tourTitle').textContent = step.title;
		$('#tourBody').textContent = step.body;
		$('#tourProgressBar').style.width = (((idx + 1) / steps.length) * 100).toFixed(1) + '%';

		idx += 1;
		state.tourTimer = window.setTimeout(runStep, step.dwell);
	};

	runStep();
}

// ======================================
// TELEMETRY SYSTEM - Mission Control
// ======================================
function drawGauge(canvas, value, color, label) {
	const ctx = canvas.getContext('2d');
	const w = canvas.width, h = canvas.height;
	const centerX = w / 2, centerY = h / 2;
	const radius = 65;

	// Clear
	ctx.clearRect(0, 0, w, h);

	// Background ring (dark)
	ctx.strokeStyle = 'rgba(100,130,160,0.15)';
	ctx.lineWidth = 8;
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
	ctx.stroke();

	// Gauge backing arc
	ctx.strokeStyle = 'rgba(100,130,160,0.25)';
	ctx.lineWidth = 8;
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
	ctx.stroke();

	// Value arc
	const angle = (value / 100) * Math.PI * 1.8;
	ctx.strokeStyle = color;
	ctx.lineWidth = 8;
	ctx.lineCap = 'round';
	ctx.shadowColor = color;
	ctx.shadowBlur = 12;
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
	ctx.stroke();
	ctx.shadowColor = 'transparent';

	// Center dot
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
	ctx.fill();

	// Tick marks (every 10%)
	for (let i = 0; i <= 10; i++) {
		const tick = (-Math.PI / 2) + (i / 10) * Math.PI * 1.8;
		const x1 = centerX + Math.cos(tick) * (radius - 8);
		const y1 = centerY + Math.sin(tick) * (radius - 8);
		const x2 = centerX + Math.cos(tick) * (radius + 4);
		const y2 = centerY + Math.sin(tick) * (radius + 4);

		ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
		ctx.lineWidth = i % 2 === 0 ? 2 : 1;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}
}

function animateTelemetry() {
	const gauges = [
		{ id: '#fuelGauge', value: 'fuel', color: '#ff6b35' },
		{ id: '#powerGauge', value: 'power', color: '#ffd60a' },
		{ id: '#commsGauge', value: 'comms', color: '#00d9ff' },
		{ id: '#integrityGauge', value: 'integrity', color: '#2ecc71' },
	];

	gauges.forEach((g) => {
		const canvas = $(g.id);
		if (!canvas) return;
		const target = state.telemetryValues[g.value];
		drawGauge(canvas, target, g.color, g.value);

		// Update readout value
		const valueEl = $(`#${g.value}Value`);
		if (valueEl) {
			const current = parseFloat(valueEl.textContent);
			const next = lerp(current, target, 0.08);
			valueEl.textContent = (g.value === 'comms' ? next.toFixed(1) : next.toFixed(1));
		}
	});

	// Oscillate values slightly for realism
	state.telemetryValues.fuel = clamp(state.telemetryValues.fuel + (Math.random() - 0.5) * 0.3, 82, 95);
	state.telemetryValues.power = clamp(state.telemetryValues.power + (Math.random() - 0.5) * 0.4, 88, 98);
	state.telemetryValues.comms = clamp(state.telemetryValues.comms + (Math.random() - 0.5) * 0.25, 85, 98);
	state.telemetryValues.integrity = clamp(state.telemetryValues.integrity + (Math.random() - 0.5) * 0.2, 98.5, 100);

	state.telemetryFrames = requestAnimationFrame(animateTelemetry);
}

function initTelemetry() {
	// Initialize gauges and start animation when section comes into view
	const section = $('#s-control');
	if (!section) return;

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting && !state.telemetryFrames) {
				animateTelemetry();
			}
		});
	}, { threshold: 0.3 });

	observer.observe(section);

	// Draw initial state
	const gauges = [
		{ id: '#fuelGauge', value: 'fuel', color: '#ff6b35' },
		{ id: '#powerGauge', value: 'power', color: '#ffd60a' },
		{ id: '#commsGauge', value: 'comms', color: '#00d9ff' },
		{ id: '#integrityGauge', value: 'integrity', color: '#2ecc71' },
	];

	gauges.forEach((g) => {
		const canvas = $(g.id);
		if (canvas) {
			drawGauge(canvas, state.telemetryValues[g.value], g.color, g.value);
		}
	});
}

function initTourControls() {
	const tourBtn = $('#tourToggle');
	if (!tourBtn) return;

	tourBtn.addEventListener('click', startGuidedTour);
	$('#tourStopBtn')?.addEventListener('click', stopGuidedTour);
}

function onSectionEnter(idx) {
	if (!state.replayMilestones[idx]) {
		state.replayMilestones[idx] = true;
		recordReplayEvent('Chapter Reached', `Entered ${chapterLabel(idx)}.`, idx);
	}

	if (idx === 2) {
		triggerLaunch();
	}
	if (idx === 3) {
		initOrbitCanvas();
		triggerBars();
	}
	if (idx === 6) {
		initLandingCanvas();
		triggerEDL();
	}
	if (idx === 7) triggerFinalCounters();
	if (idx === 8) initMissionLab();
	if (idx === 9) calculateMissionAnalytics();
}

// ======================================
// CREW BIOMETRICS SYSTEM
// ======================================
function animateCrewBiometrics() {
	const crews = ['crew0', 'crew1', 'crew2', 'crew3'];
	crews.forEach((crewId, idx) => {
		const bio = state.crewBiometrics[crewId];
		
		// Animate heart rate (60-90 with variation)
		bio.heart = clamp(bio.heart + (Math.random() - 0.5) * 2, 60, 90);
		// Animate O2 (95-100)
		bio.o2 = clamp(bio.o2 + (Math.random() - 0.5) * 0.5, 95, 100);
		
		// Update DOM
		const heartEl = $(`#${crewId}-heart`);
		const o2El = $(`#${crewId}-o2`);
		if (heartEl) heartEl.textContent = bio.heart.toFixed(0);
		if (o2El) o2El.textContent = bio.o2.toFixed(0);
	});
	
	requestAnimationFrame(animateCrewBiometrics);
}

function initCrewBiometrics() {
	const section = $('#s-crew');
	if (!section) return;
	
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				animateCrewBiometrics();
				observer.disconnect();
			}
		});
	}, { threshold: 0.3 });
	
	observer.observe(section);
}

// ======================================
// PRE-LAUNCH CHECKLIST MINI-GAME
// ======================================
function initPrelaunchChecklist() {
	const modal = $('#prelaunchModal');
	if (!modal) return;
	
	// Pressure Slider
	const pressureSlider = $('#pressureSlider');
	const pressureValue = $('#pressureValue');
	if (pressureSlider) {
		pressureSlider.addEventListener('input', (e) => {
			const val = parseInt(e.target.value);
			pressureValue.textContent = val;
			if (val >= 1500 && val <= 1600) {
				state.prelaunchChecks.pressure = true;
				$('#check1').style.opacity = '0.7';
				$('#check1').style.borderColor = 'rgba(46,204,113,0.5)';
			} else {
				state.prelaunchChecks.pressure = false;
			}
			updateChecklistProgress();
		});
	}
	
	// Battery Sequence Game
	const batBtns = $$('.bat-btn');
	let batSequence = [];
	batBtns.forEach((btn) => {
		btn.addEventListener('click', (e) => {
			const idx = parseInt(btn.dataset.correct);
			batSequence.push(idx);
			btn.classList.add('correct');
			setTimeout(() => btn.classList.remove('correct'), 300);
			
			if (batSequence.length === 3) {
				if (batSequence.join('') === '012') {
					state.prelaunchChecks.battery = true;
					$('#check2').style.opacity = '0.7';
					$('#check2').style.borderColor = 'rgba(46,204,113,0.5)';
					$('#seqDisplay').textContent = '✓ CORRECT';
					$('#seqDisplay').style.color = 'var(--telem-struct)';
				} else {
					batSequence = [];
					$('#seqDisplay').textContent = '✗ TRY AGAIN';
					$('#seqDisplay').style.color = 'var(--hud-red)';
				}
				updateChecklistProgress();
			}
		});
	});
	
	// Pattern Matching
	const patterns = ['green', 'blue', 'red', 'yellow'];
	const patBtns = $$('.pat-btn');
	let userPattern = [];
	
	// Show pattern initially
	const patDisplay = $('#patternDisplay');
	patDisplay.textContent = '🟢 🔵 🔴 🟡';
	
	patBtns.forEach((btn) => {
		btn.addEventListener('click', (e) => {
			const color = btn.dataset.color;
			userPattern.push(color);
			btn.style.transform = 'scale(0.9)';
			setTimeout(() => btn.style.transform = '', 150);
			
			if (userPattern.length === 4) {
				if (userPattern.join(',') === patterns.join(',')) {
					state.prelaunchChecks.pattern = true;
					$('#check3').style.opacity = '0.7';
					$('#check3').style.borderColor = 'rgba(46,204,113,0.5)';
					patDisplay.textContent = '✓ PATTERN MATCHED';
					patDisplay.style.color = 'var(--telem-struct)';
				} else {
					userPattern = [];
					patDisplay.textContent = '✗ TRY AGAIN';
					patDisplay.style.color = 'var(--hud-red)';
					setTimeout(() => {
						patDisplay.textContent = '🟢 🔵 🔴 🟡';
						patDisplay.style.color = '';
					}, 2000);
				}
				updateChecklistProgress();
			}
		});
	});
	
	// Confirm Launch
	const confirmBtn = $('#launchConfirmBtn');
	if (confirmBtn) {
		confirmBtn.addEventListener('click', () => {
			state.prelaunchChecks.confirmed = true;
			modal.classList.remove('active');
			recordReplayEvent('Pre-Launch Cleared', 'All 3 checks passed. Flight director approved launch.', 2);
			triggerLaunch();
		});
	}
}

function updateChecklistProgress() {
	const checks = Object.values(state.prelaunchChecks).slice(0, 3);
	const completed = checks.filter(c => c).length;
	const progress = ($('#checklistProgress'));
	const status = $('#checklistStatus');
	const confirmBtn = $('#launchConfirmBtn');
	
	if (progress) progress.style.width = (completed * 25) + '%';
	if (status) status.textContent = `${completed}/3 Complete`;
	
	if (completed === 3) {
		if (confirmBtn) {
			confirmBtn.disabled = false;
			confirmBtn.style.opacity = '1';
		}
		const confirmStatus = $('#confirmStatus');
		if (confirmStatus) confirmStatus.textContent = 'Ready to launch!';
	}
}

// ======================================
// CRISIS EVENT SYSTEM
// ======================================
const crisisScenarios = [
	{
		title: 'SOLAR RADIATION SPIKE',
		description: 'Unexpected solar flare detected. Magnetic shielding stress at 82%. Override protocol?',
		impact: 'Crew health at risk. Response required in 30 seconds.',
		choices: [
			{ text: 'REDIRECT POWER TO SHIELDING', effect: 'shields', success: 0.9 },
			{ text: 'HUNKER DOWN - WAIT IT OUT', effect: 'time', success: 0.6 },
		],
	},
	{
		title: 'COMMUNICATION DROPOUT',
		description: 'Ground stations lost signal. Last telemetry shows nominal  status. Autonomous nav active for 47 minutes.',
		impact: 'Crew must make own decisions. Risk of course deviation.',
		choices: [
			{ text: 'CORRECT COURSE MANUALLY', effect: 'skill', success: 0.75 },
			{ text: 'TRUST AUTOPILOT - MAINTAIN COURSE', effect: 'faith', success: 0.85 },
		],
	},
	{
		title: 'THERMAL SPIKE - ENGINE SECTION',
		description: 'Coolant circulation showing anomaly. Temperature rising in Engine Bay. Potential cascading failure.',
		impact: 'Must re-prioritize fuel reserves or risk total engine loss.',
		choices: [
			{ text: 'PERFORM EMERGENCY FLUSH', effect: 'maint', success: 0.7 },
			{ text: 'ACCEPT REDUCED THRUST CAPACITY', effect: 'compromise', success: 0.85 },
		],
	},
];

function triggerCrisisEvent() {
	if (Math.random() > 0.4) return;
	
	const scenario = crisisScenarios[Math.floor(Math.random() * crisisScenarios.length)];
	const modal = $('#crisisModal');
	const choiceButtons = $$('.crisis-btn');
	
	if (!modal) return;
	
	$('#crisisTitle').textContent = scenario.title;
	$('#crisisDescription').textContent = scenario.description;
	$('#crisisImpact').textContent = 'Impact: ' + scenario.impact;
	
	const choice1 = $('#crisisChoice1');
	const choice2 = $('#crisisChoice2');
	
	if (choice1) {
		choice1.textContent = scenario.choices[0].text;
		choice1.onclick = () => handleCrisisChoice(scenario.choices[0]);
	}
	if (choice2) {
		choice2.textContent = scenario.choices[1].text;
		choice2.onclick = () => handleCrisisChoice(scenario.choices[1]);
	}
	
	modal.classList.add('active');
}

function handleCrisisChoice(choice) {
	const modal = $('#crisisModal');
	const success = Math.random() < choice.success;
	const footer = $('#crisisFooter');
	
	state.crisisEvents.push({
		choice: choice.effect,
		success: success,
	});
	recordReplayEvent(
		`Crisis: ${choice.effect.toUpperCase()}`,
		success ? 'Crew response successful. Mission stability improved.' : 'Partial mitigation. Crew stress increased.',
		state.activeSection
	);
	
	if (footer) {
		footer.textContent = success ? 
			'✓ Action successful. Crisis averted.' :
			'✗ Partial mitigation. Increased crew stress.';
		footer.style.color = success ? 'var(--telem-struct)' : 'var(--hud-amber)';
	}
	
	setTimeout(() => {
		modal.classList.remove('active');
	}, 3000);
}

// ======================================
// MISSION ANALYTICS & SUCCESS CALCULATION
// ======================================
function calculateMissionAnalytics() {
	// Base success rate
	let successRate = 87.4;
	
	// Adjust based on pre-launch checks
	if (state.prelaunchChecks.pressure) successRate += 2;
	if (state.prelaunchChecks.battery) successRate += 1.5;
	if (state.prelaunchChecks.pattern) successRate += 1;
	
	// Adjust based on crisis management
	state.crisisEvents.forEach((evt) => {
		if (evt.success) successRate += 1.5;
		else successRate -= 1;
	});
	
	successRate = clamp(successRate, 0, 100);
	state.missionSuccess = successRate;
	
	// Populate analytics dashboard
	const outcome = $('#missionOutcome');
	if (outcome) {
		outcome.textContent = successRate > 85 ? 
			'MISSION STATUS: SUCCESS ✓' :
			'MISSION STATUS: PARTIAL SUCCESS ⚠';
		outcome.style.color = successRate > 85 ? 'var(--hud-green)' : 'var(--hud-amber)';
	}
	
	const successProbEl = $('#successProbability');
	if (successProbEl) successProbEl.textContent = successRate.toFixed(1) + '%';
	
	const successBar = $('#successBar');
	if (successBar) successBar.style.width = successRate + '%';
	
	// Populate crew performance
	const crewStats = $('#crewStats');
	if (crewStats) {
		const grades = ['A+', 'A', 'A+', 'A'];
		crewStats.innerHTML = `
			<div class="cs-row"><span>Commander</span><span class="cs-grade">${grades[0]}</span></div>
			<div class="cs-row"><span>Pilot</span><span class="cs-grade">${grades[1]}</span></div>
			<div class="cs-row"><span>Scientist</span><span class="cs-grade">${grades[2]}</span></div>
			<div class="cs-row"><span>Engineer</span><span class="cs-grade">${grades[3]}</span></div>
		`;
	}
	
	// Science yield
	const scienceScore = Math.round(92 + (successRate > 90 ? 8 : 0));
	const sciEl = $('#scienceScore');
	if (sciEl) sciEl.textContent = scienceScore;
	
	// Populate decision log
	const analysisLog = $('#analysisLog');
	if (analysisLog) {
		let html = '';
		state.crisisEvents.forEach((evt, i) => {
			html += `<div class="analysis-item">• ${i+1}. Crisis Response: ${evt.choice} - ${evt.success ? 'Successful' : 'Partial'}</div>`;
		});
		if (html) analysisLog.innerHTML = html;
		else analysisLog.innerHTML = '<div class="analysis-item">No major crisis events detected during mission.</div>';
	}

	recordReplayEvent('Mission Analytics', `Final success probability computed at ${successRate.toFixed(1)}%.`, 9);
}

function initShareResults() {
	const shareBtn = $('#shareResultsBtn');
	if (shareBtn) {
		shareBtn.addEventListener('click', () => {
			const text = `🚀 ARES-I MISSION COMPLETE! 🚀
Success Rate: ${state.missionSuccess.toFixed(1)}%
Discoveries Made: 4
Crew: All nominal
Status: MISSION ACCOMPLISHED ✓

Join the journey to Mars: https://ares-mars.mission`;
			
			if (navigator.share) {
				navigator.share({ title: 'ARES-I Mission Results', text });
			} else {
				navigator.clipboard.writeText(text);
				alert('Results copied! Share them with your friends.');
			}
		});
	}
}

// ======================================
// INTEGRATION: Update onSectionEnter
// ======================================

function init() {
	// Defensive reset in case stale state/cached classes leave overlays active.
	const prelaunchModal = $('#prelaunchModal');
	const crisisModal = $('#crisisModal');
	[prelaunchModal, crisisModal].forEach((modal) => {
		if (!modal) return;
		modal.classList.remove('active', 'shown');
	});

	initLoader();
	initCursor();
	initStarfield();
	initHUD();
	initScrollReveal();
	initHeroCounters();
	initNavigation();
	initKeyboardNav();
	initDiscoveryCards();
	initParallax();
	initApproachTimer();
	initSectionProgress();
	initCrewBiometrics();
	initPrelaunchChecklist();
	initTelemetry();
	initAudio();
	initTourControls();
	initShareResults();
	initMissionReplay();
	
	// Trigger crisis events occasionally at certain sections
	const crisisInterval = setInterval(() => {
		if (state.activeSection >= 3 && state.activeSection <= 7) {
			triggerCrisisEvent();
		}
	}, Math.random() * 60000 + 30000);

	// Fallback: never let the loader block the page indefinitely.
	window.setTimeout(() => {
		$('#loader')?.classList.add('hidden');
		$('#space-canvas')?.classList.add('visible');
	}, 5500);
}

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('visibilitychange', () => {
	if (!document.hidden) return;
	if (state.orbitFrame) cancelAnimationFrame(state.orbitFrame);
	if (state.landingFrame) cancelAnimationFrame(state.landingFrame);
});
