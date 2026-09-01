//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/utils.js
var e = Array.isArray, t = Array.prototype.indexOf, n = Array.prototype.includes, r = Array.from, i = Object.defineProperty, a = Object.getOwnPropertyDescriptor, o = Object.getOwnPropertyDescriptors, s = Object.prototype, c = Array.prototype, l = Object.getPrototypeOf, u = Object.isExtensible, d = () => {};
function f(e) {
	for (var t = 0; t < e.length; t++) e[t]();
}
function p() {
	var e, t;
	return {
		promise: new Promise((n, r) => {
			e = n, t = r;
		}),
		resolve: e,
		reject: t
	};
}
var m = 1024, h = 2048, g = 4096, _ = 8192, v = 16384, y = 32768, b = 1 << 25, x = 65536, S = 1 << 19, C = 1 << 20, w = 1 << 25, T = 65536, E = 1 << 21, ee = 1 << 22, te = 1 << 23, ne = Symbol("$state"), re = Symbol("legacy props"), ie = Symbol(""), ae = Symbol("attributes"), oe = Symbol("class"), se = Symbol("style"), ce = Symbol("text"), le = Symbol("form reset"), ue = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), de = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/errors.js
function fe() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function pe(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function me(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function he() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function ge(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function _e() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function ve(e) {
	throw Error("https://svelte.dev/e/props_invalid_value");
}
function ye() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function be() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function xe() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Se() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/constants.js
var Ce = {}, D = Symbol("uninitialized"), we = "http://www.w3.org/1999/xhtml";
function Te() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function Ee(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function De() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/hydration.js
var O = !1;
function Oe(e) {
	O = e;
}
var k;
function A(e) {
	if (e === null) throw Ee(), Ce;
	return k = e;
}
function ke() {
	return A(/* @__PURE__ */ en(k));
}
function j(e) {
	if (O) {
		if (/* @__PURE__ */ en(k) !== null) throw Ee(), Ce;
		k = e;
	}
}
function Ae(e = 1) {
	if (O) {
		for (var t = e, n = k; t--;) n = /* @__PURE__ */ en(n);
		k = n;
	}
}
function je(e = !0) {
	for (var t = 0, n = k;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ en(n);
		e && n.remove(), n = i;
	}
}
function Me(e) {
	if (!e || e.nodeType !== 8) throw Ee(), Ce;
	return e.data;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/equality.js
function Ne(e) {
	return e === this.v;
}
function Pe(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function Fe(e) {
	return !Pe(e, this.v);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/context.js
var M = null;
function Ie(e) {
	M = e;
}
function Le(e, t = !1, n) {
	M = {
		p: M,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: W,
		l: null
	};
}
function Re(e) {
	var t = M, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) pn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, M = t.p, e ?? {};
}
function ze() {
	return !0;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/task.js
var Be = [];
function Ve() {
	var e = Be;
	Be = [], f(e);
}
function He(e) {
	if (Be.length === 0 && !Ct) {
		var t = Be;
		queueMicrotask(() => {
			t === Be && Ve();
		});
	}
	Be.push(e);
}
function Ue() {
	for (; Be.length > 0;) Ve();
}
function We(e) {
	var t = W;
	if (t === null) return U.f |= te, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	Ge(e, t);
}
function Ge(e, t) {
	if (!(t !== null && t.f & 16384)) {
		for (; t !== null;) {
			if (t.f & 128) {
				if (!(t.f & 32768)) throw e;
				try {
					t.b.error(e);
					return;
				} catch (t) {
					e = t;
				}
			}
			t = t.parent;
		}
		throw e;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/status.js
var Ke = ~(h | g | m);
function N(e, t) {
	e.f = e.f & Ke | t;
}
function qe(e) {
	e.f & 512 || e.deps === null ? N(e, m) : N(e, g);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/utils.js
function Je(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= T, Je(t.deps));
}
function Ye(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), Je(e.deps), N(e, m);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/store.js
var Xe = !1;
function Ze(e) {
	var t = Xe;
	try {
		return Xe = !1, [e(), Xe];
	} finally {
		Xe = t;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/misc.js
var Qe = !1;
function $e() {
	Qe || (Qe = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[le]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function et(e) {
	var t = U, n = W;
	Pn(null), Fn(null);
	try {
		return e();
	} finally {
		Pn(t), Fn(n);
	}
}
function tt(e, t, n, r = n) {
	e.addEventListener(t, () => et(n));
	let i = e[le];
	e[le] = i ? () => {
		i(), r(!0);
	} : () => r(!0), $e();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/reactivity/create-subscriber.js
function nt(e) {
	let t = 0, n = Bt(0), r;
	return () => {
		un() && (q(n), _n(() => (t === 0 && (r = er(() => e(() => Wt(n)))), t += 1, () => {
			He(() => {
				--t, t === 0 && (r?.(), r = void 0, Wt(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var rt = x | S;
function it(e, t, n, r) {
	new at(e, t, n, r);
}
var at = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = O ? k : null;
	#n;
	#r;
	#i;
	#a = null;
	#o = null;
	#s = null;
	#c = null;
	#l = 0;
	#u = 0;
	#d = !1;
	#f = /* @__PURE__ */ new Set();
	#p = /* @__PURE__ */ new Set();
	#m = null;
	#h = nt(() => (this.#m = Bt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = vn(() => {
			if (O) {
				let e = this.#t;
				ke();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, rt), O && (this.#e = k);
	}
	#g() {
		try {
			this.#a = V(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		He(r), t && (this.#s = V(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				De();
				return;
			}
			t = !0, n && Se(), this.#s !== null && wn(this.#s, () => {
				this.#s = null;
			}), this.#S(() => {
				this.#b();
			});
		};
		return {
			reset: r,
			invoke_onerror: () => {
				try {
					n = !0, this.#n.onerror?.(e, r), n = !1;
				} catch (e) {
					Ge(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = V(() => e(this.#e)), He(() => {
			var e = this.#c = document.createDocumentFragment(), t = Qt();
			e.append(t), this.#a = this.#S(() => V(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, wn(this.#o, () => {
				this.#o = null;
			}), this.#x(F));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = V(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				On(this.#a, e);
				let t = this.#n.pending;
				this.#o = V(() => t(this.#e));
			} else this.#x(F);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		Ye(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = U, r = M;
		Fn(this.#i), Pn(this.#i), Ie(this.#i.ctx);
		try {
			return kt.ensure(), e();
		} catch (e) {
			return We(e), null;
		} finally {
			Fn(t), Pn(n), Ie(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && wn(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, He(() => {
			this.#d = !1, this.#m && Ht(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), q(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		F?.is_fork ? (this.#a && F.skip_effect(this.#a), this.#o && F.skip_effect(this.#o), this.#s && F.skip_effect(this.#s), F.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (H(this.#a), null), this.#o &&= (H(this.#o), null), this.#s &&= (H(this.#s), null), O && (A(this.#t), Ae(), A(je()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return V(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return Ge(e, this.#i.parent), null;
				}
			}));
		};
		He(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				Ge(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => Ge(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/async.js
function ot(e, t, n, r) {
	let i = ze() ? ut : pt;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = st(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				Ge(e, s);
			}
			ct();
		}
	}
	var d = lt();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ ft(e))).then(u).catch((e) => Ge(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), ct();
	}) : f();
}
function st() {
	var e = W, t = U, n = M, r = F;
	return function(i = !0) {
		Fn(e), Pn(t), Ie(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function ct(e = !0) {
	Fn(null), Pn(null), Ie(null), e && F?.deactivate();
}
function lt() {
	var e = W, t = e.b, n = F, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function ut(e) {
	var t = 2 | h;
	return W !== null && (W.f |= S), {
		ctx: M,
		deps: null,
		effects: null,
		equals: Ne,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: D,
		wv: 0,
		parent: W,
		ac: null
	};
}
var dt = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function ft(e, t, n) {
	let r = W;
	r === null && fe();
	var i = void 0, a = Bt(D), o = !U, s = /* @__PURE__ */ new Set();
	return gn(() => {
		var t = W, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== ue && n.reject(e);
			}).finally(ct);
		} catch (e) {
			n.reject(e), ct();
		}
		var c = F;
		if (o) {
			if (t.f & 32768) var l = lt();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(dt);
			else for (let e of s.values()) e.reject(dt);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== dt && (c.activate(), t ? (a.f |= te, Ht(a, t)) : (a.f & 8388608 && (a.f ^= te), Ht(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), dn(() => {
		for (let e of s) e.reject(dt);
	}), new Promise((e) => {
		function t(n) {
			function r() {
				n === i ? e(a) : t(i);
			}
			n.then(r, r);
		}
		t(i);
	});
}
/*#__NO_SIDE_EFFECTS__*/
function P(e) {
	let t = /* @__PURE__ */ ut(e);
	return Ln(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function pt(e) {
	let t = /* @__PURE__ */ ut(e);
	return t.equals = Fe, t;
}
function mt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) H(t[n]);
	}
}
function ht(e) {
	var t, n = W, r = e.parent;
	if (!jn && r !== null && e.v !== D && r.f & 24576) return Te(), e.v;
	Fn(r);
	try {
		e.f &= ~T, mt(e), t = qn(e);
	} finally {
		Fn(n);
	}
	return t;
}
function gt(e) {
	var t = ht(e);
	if (!e.equals(t) && (e.wv = Wn(), (!F?.is_fork || e.deps === null) && (F === null ? e.v = t : (F.capture(e, t, !0), bt?.capture(e, t, !0)), e.deps === null))) {
		N(e, m);
		return;
	}
	jn || (xt === null ? qe(e) : (un() || F?.is_fork) && xt.set(e, t));
}
function _t(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && et(() => {
		t.ac.abort(ue), t.ac = null;
	}), t.fn !== null && (t.teardown = d), Yn(t, 0), bn(t));
}
function vt(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && Xn(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/batch.js
var yt = null, F = null, bt = null, xt = null, St = null, Ct = !1, wt = !1, Tt = null, Et = null, Dt = 0, Ot = 1, kt = class e {
	id = Ot++;
	#e = !1;
	linked = !0;
	#t = null;
	#n = null;
	async_deriveds = /* @__PURE__ */ new Map();
	current = /* @__PURE__ */ new Map();
	previous = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Set();
	#i = /* @__PURE__ */ new Set();
	#a = 0;
	#o = /* @__PURE__ */ new Map();
	#s = null;
	#c = [];
	#l = [];
	#u = /* @__PURE__ */ new Set();
	#d = /* @__PURE__ */ new Set();
	#f = /* @__PURE__ */ new Map();
	#p = /* @__PURE__ */ new Set();
	is_fork = !1;
	#m = !1;
	constructor() {
		yt === null ? yt = this : (yt.#n = this, this.#t = yt), yt = this;
	}
	#h() {
		if (this.is_fork) return !0;
		for (let n of this.#o.keys()) {
			for (var e = n, t = !1; e.parent !== null;) {
				if (this.#f.has(e)) {
					t = !0;
					break;
				}
				e = e.parent;
			}
			if (!t) return !0;
		}
		return !1;
	}
	skip_effect(e) {
		this.#f.has(e) || this.#f.set(e, {
			d: [],
			m: []
		}), this.#p.delete(e);
	}
	unskip_effect(e, t = (e) => this.schedule(e)) {
		var n = this.#f.get(e);
		if (n) {
			this.#f.delete(e);
			for (var r of n.d) N(r, h), t(r);
			for (r of n.m) N(r, g), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		this.#e = !0, Dt++ > 1e3 && (this.#x(), jt());
		for (let e of this.#u) this.#d.delete(e), N(e, h), this.schedule(e);
		for (let e of this.#d) N(e, g), this.schedule(e);
		let t = this.#c;
		this.#c = [], this.apply();
		var n = Tt = [], r = [], i = Et = [];
		for (let e of t) try {
			this.#_(e, n, r);
		} catch (t) {
			throw It(e), this.#h() || this.discard(), t;
		}
		if (F = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (Tt = null, Et = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) Ft(e, t);
			i.length > 0 && F.#g();
			return;
		}
		let o = this.#v();
		if (o) {
			this.#b(r), this.#b(n), o.#y(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), bt = this, Nt(r), Nt(n), bt = null, this.#s?.resolve();
		var s = F;
		if (this.#a === 0 && (this.#c.length === 0 || s !== null) && this.#x(), this.#c.length > 0) {
			if (s !== null) {
				let e = s;
				e.#c.push(...this.#c.filter((t) => !e.#c.includes(t)));
			} else s = this;
		}
		s !== null && s.#g();
	}
	#_(e, t, n) {
		e.f ^= m;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= m : i & 4 ? t.push(r) : Gn(r) && (i & 16 && this.#d.add(r), Xn(r));
				var o = r.first;
				if (o !== null) {
					r = o;
					continue;
				}
			}
			for (; r !== null;) {
				var s = r.next;
				if (s !== null) {
					r = s;
					break;
				}
				r = r.parent;
			}
		}
	}
	#v() {
		for (var e = this.#t; e !== null;) {
			if (!e.is_fork) {
				for (let [t, [, n]] of this.current) if (e.current.has(t) && !n) return e;
			}
			e = e.#t;
		}
		return null;
	}
	#y(e) {
		for (let [t, n] of e.current) !this.previous.has(t) && e.previous.has(t) && this.previous.set(t, e.previous.get(t)), this.current.set(t, n);
		for (let [t, n] of e.async_deriveds) {
			let e = this.async_deriveds.get(t);
			e && n.promise.then(e.resolve).catch(e.reject);
		}
		e.async_deriveds.clear(), this.transfer_effects(e.#u, e.#d);
		let t = (e) => {
			var n = e.reactions;
			if (n !== null && !(e.f & 2 && !(e.f & 6144))) for (let e of n) {
				var r = e.f;
				if (r & 2) t(e);
				else {
					var i = e;
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), N(i, h), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#x(), F = this, this.#g();
	}
	#b(e) {
		for (var t = 0; t < e.length; t += 1) Ye(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== D && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), xt?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		F = this;
	}
	deactivate() {
		F = null, xt = null;
	}
	flush() {
		try {
			wt = !0, F = this, this.#g();
		} finally {
			Dt = 0, St = null, Tt = null, Et = null, wt = !1, F = null, xt = null, Rt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(dt);
		this.#x(), this.#s?.resolve();
	}
	register_created_effect(e) {
		this.#l.push(e);
	}
	increment(e, t) {
		if (this.#a += 1, e) {
			let e = this.#o.get(t) ?? 0;
			this.#o.set(t, e + 1);
		}
	}
	decrement(e, t) {
		if (--this.#a, e) {
			let e = this.#o.get(t) ?? 0;
			e === 1 ? this.#o.delete(t) : this.#o.set(t, e - 1);
		}
		this.#m || (this.#m = !0, He(() => {
			this.#m = !1, this.linked && this.flush();
		}));
	}
	transfer_effects(e, t) {
		for (let t of e) this.#u.add(t);
		for (let e of t) this.#d.add(e);
		e.clear(), t.clear();
	}
	oncommit(e) {
		this.#r.add(e);
	}
	ondiscard(e) {
		this.#i.add(e);
	}
	settled() {
		return (this.#s ??= p()).promise;
	}
	static ensure() {
		if (F === null) {
			let t = F = new e();
			!wt && !Ct && He(() => {
				t.#e || t.flush();
			});
		}
		return F;
	}
	apply() {
		xt = null;
	}
	schedule(e) {
		if (St = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		for (var t = e; t.parent !== null;) {
			t = t.parent;
			var n = t.f;
			if (Tt !== null && t === W && (U === null || !(U.f & 2))) return;
			if (n & 96) {
				if (!(n & 1024)) return;
				t.f ^= m;
			}
		}
		this.#c.push(t);
	}
	#x() {
		if (this.linked) {
			var e = this.#t, t = this.#n;
			e === null || (e.#n = t), t === null ? yt = e : t.#t = e, this.linked = !1;
		}
	}
};
function At(e) {
	var t = Ct;
	Ct = !0;
	try {
		var n;
		for (e && (F !== null && !F.is_fork && F.flush(), n = e());;) {
			if (Ue(), F === null) return n;
			F.flush();
		}
	} finally {
		Ct = t;
	}
}
function jt() {
	try {
		_e();
	} catch (e) {
		Ge(e, St);
	}
}
var Mt = null;
function Nt(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && Gn(r) && (Mt = /* @__PURE__ */ new Set(), Xn(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && Cn(r), Mt?.size > 0)) {
				Rt.clear();
				for (let e of Mt) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) Mt.has(n) && (Mt.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || Xn(n);
					}
				}
				Mt.clear();
			}
		}
		Mt = null;
	}
}
function Pt(e) {
	F.schedule(e);
}
function Ft(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), N(e, m);
		for (var n = e.first; n !== null;) Ft(n, t), n = n.next;
	}
}
function It(e) {
	N(e, m);
	for (var t = e.first; t !== null;) It(t), t = t.next;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/sources.js
var Lt = /* @__PURE__ */ new Set(), Rt = /* @__PURE__ */ new Map(), zt = !1;
function Bt(e, t) {
	return {
		f: 0,
		v: e,
		reactions: null,
		equals: Ne,
		rv: 0,
		wv: 0
	};
}
/*#__NO_SIDE_EFFECTS__*/
function I(e, t) {
	let n = Bt(e, t);
	return Ln(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function Vt(e, t = !1, n = !0) {
	let r = Bt(e);
	return t || (r.equals = Fe), r;
}
function L(e, t, n = !1) {
	return U !== null && (!Nn || U.f & 131072) && ze() && U.f & 4325394 && (In === null || !In.has(e)) && xe(), Ht(e, n ? Kt(t) : t, Et);
}
function Ht(e, t, n = null) {
	if (!e.equals(t)) {
		Rt.set(e, jn ? t : e.v);
		var r = kt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && ht(t), xt === null && qe(t);
		}
		e.wv = Wn(), Gt(e, h, n), ze() && W !== null && W.f & 1024 && !(W.f & 96) && (Rn === null ? zn([e]) : Rn.push(e)), !r.is_fork && Lt.size > 0 && !zt && Ut();
	}
	return t;
}
function Ut() {
	zt = !1;
	for (let e of Lt) {
		e.f & 1024 && N(e, g);
		let t;
		try {
			t = Gn(e);
		} catch {
			t = !0;
		}
		t && Xn(e);
	}
	Lt.clear();
}
function Wt(e) {
	L(e, e.v + 1);
}
function Gt(e, t, n) {
	var r = e.reactions;
	if (r !== null) for (var i = ze(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === W)) {
			var l = (c & h) === 0;
			if (l && N(s, t), c & 131072) Lt.add(s);
			else if (c & 2) {
				var u = s;
				xt?.delete(u), c & 65536 || (c & 512 && (W === null || !(W.f & 2097152)) && (s.f |= T), Gt(u, g, n));
			} else if (l) {
				var d = s;
				c & 16 && Mt !== null && Mt.add(d), n === null ? Pt(d) : n.push(d);
			}
		}
	}
}
function Kt(t) {
	if (typeof t != "object" || !t || ne in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ I(0), u = null, d = Hn, f = (e) => {
		if (Hn === d) return e();
		var t = U, n = Hn;
		Pn(null), Un(d);
		var r = e();
		return Pn(t), Un(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ I(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && ye();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ I(n.value, u);
				return r.set(t, e), e;
			}) : L(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ I(D, u));
					r.set(t, e), Wt(o);
				}
			} else L(n, D), Wt(o);
			return !0;
		},
		get(e, n, i) {
			if (n === ne) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ I(Kt(s ? e[n] : D), u)), r.set(n, o)), o !== void 0) {
				var c = q(o);
				return c === D ? void 0 : c;
			}
			return Reflect.get(e, n, i);
		},
		getOwnPropertyDescriptor(e, t) {
			var n = Reflect.getOwnPropertyDescriptor(e, t);
			if (n && "value" in n) {
				var i = r.get(t);
				i && (n.value = q(i));
			} else if (n === void 0) {
				var a = r.get(t), o = a?.v;
				if (a !== void 0 && o !== D) return {
					enumerable: !0,
					configurable: !0,
					value: o,
					writable: !0
				};
			}
			return n;
		},
		has(e, t) {
			if (t === ne) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== D || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ I(i ? Kt(e[t]) : D, u)), r.set(t, n)), q(n) === D) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ I(D, u)), r.set(d + "", p)) : L(p, D);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ I(void 0, u)), L(c, Kt(n)), r.set(t, c));
			else {
				l = c.v !== D;
				var m = f(() => Kt(n));
				L(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && L(g, _ + 1);
				}
				Wt(o);
			}
			return !0;
		},
		ownKeys(e) {
			q(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== D;
			});
			for (var [n, i] of r) i.v !== D && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			be();
		}
	});
}
var qt, Jt, Yt, Xt;
function Zt() {
	if (qt === void 0) {
		qt = window, Jt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		Yt = a(t, "firstChild").get, Xt = a(t, "nextSibling").get, u(e) && (e[oe] = void 0, e[ae] = null, e[se] = void 0, e.__e = void 0), u(n) && (n[ce] = void 0);
	}
}
function Qt(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function $t(e) {
	return Yt.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function en(e) {
	return Xt.call(e);
}
function R(e, t) {
	if (!O) return /* @__PURE__ */ $t(e);
	var n = /* @__PURE__ */ $t(k);
	if (n === null) n = k.appendChild(Qt());
	else if (t && n.nodeType !== 3) {
		var r = Qt();
		return n?.before(r), A(r), r;
	}
	return t && on(n), A(n), n;
}
function tn(e, t = !1) {
	if (!O) {
		var n = /* @__PURE__ */ $t(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ en(n) : n;
	}
	if (t) {
		if (k?.nodeType !== 3) {
			var r = Qt();
			return k?.before(r), A(r), r;
		}
		on(k);
	}
	return k;
}
function z(e, t = 1, n = !1) {
	let r = O ? k : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ en(r);
	if (!O) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = Qt();
			return r === null ? i?.after(a) : r.before(a), A(a), a;
		}
		on(r);
	}
	return A(r), r;
}
function nn(e) {
	e.textContent = "";
}
function rn() {
	return !1;
}
function an(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function on(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/effects.js
function sn(e) {
	W === null && (U === null && ge(e), he()), jn && me(e);
}
function cn(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function ln(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= _);
	var r = {
		ctx: M,
		deps: null,
		nodes: null,
		f: e | h | 512,
		first: null,
		fn: t,
		last: null,
		next: null,
		parent: n,
		b: n && n.b,
		prev: null,
		teardown: null,
		wv: 0,
		ac: null
	};
	F?.register_created_effect(r);
	var i = r;
	if (e & 4) Tt === null ? kt.ensure().schedule(r) : Tt.push(r);
	else if (t !== null) {
		try {
			Xn(r);
		} catch (e) {
			throw H(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= x));
	}
	if (i !== null && (i.parent = n, n !== null && cn(i, n), U !== null && U.f & 2 && !(e & 64))) {
		var a = U;
		(a.effects ??= []).push(i);
	}
	return r;
}
function un() {
	return U !== null && !Nn;
}
function dn(e) {
	let t = ln(8, null);
	return N(t, m), t.teardown = e, t;
}
function fn(e) {
	sn("$effect");
	var t = W.f;
	if (!U && t & 32 && M !== null && !M.i) {
		var n = M;
		(n.e ??= []).push(e);
	} else return pn(e);
}
function pn(e) {
	return ln(4 | C, e);
}
function mn(e) {
	kt.ensure();
	let t = ln(64 | S, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? wn(t, () => {
			H(t), n(void 0);
		}) : (H(t), n(void 0));
	});
}
function hn(e) {
	return ln(4, e);
}
function gn(e) {
	return ln(ee | S, e);
}
function _n(e, t = 0) {
	return ln(8 | t, e);
}
function B(e, t = [], n = [], r = []) {
	ot(r, t, n, (t) => {
		ln(8, () => {
			e(...t.map(q));
		});
	});
}
function vn(e, t = 0) {
	return ln(16 | t, e);
}
function V(e) {
	return ln(32 | S, e);
}
function yn(e) {
	var t = e.teardown;
	if (t !== null) {
		let e = jn, n = U;
		Mn(!0), Pn(null);
		try {
			t.call(null);
		} finally {
			Mn(e), Pn(n);
		}
	}
}
function bn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && et(() => {
			e.abort(ue);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : H(n, t), n = r;
	}
}
function xn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || H(t), t = n;
	}
}
function H(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (Sn(e.nodes.start, e.nodes.end), n = !0), e.f |= b, bn(e, t && !n), Yn(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	yn(e), e.f ^= b, e.f |= v;
	var i = e.parent;
	i !== null && i.first !== null && Cn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function Sn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ en(e);
		e.remove(), e = n;
	}
}
function Cn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function wn(e, t, n = !0) {
	var r = [];
	Tn(e, r, !0);
	var i = () => {
		n && H(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function Tn(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= _;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				Tn(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function En(e) {
	Dn(e, !0);
}
function Dn(e, t) {
	if (e.f & 8192) {
		e.f ^= _, e.f & 1024 || (N(e, h), kt.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			Dn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function On(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ en(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/legacy.js
var kn = null, An = !1, jn = !1;
function Mn(e) {
	jn = e;
}
var U = null, Nn = !1;
function Pn(e) {
	U = e;
}
var W = null;
function Fn(e) {
	W = e;
}
var In = null;
function Ln(e) {
	U !== null && (In ??= /* @__PURE__ */ new Set()).add(e);
}
var G = null, K = 0, Rn = null;
function zn(e) {
	Rn = e;
}
var Bn = 1, Vn = 0, Hn = Vn;
function Un(e) {
	Hn = e;
}
function Wn() {
	return ++Bn;
}
function Gn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 2 && (e.f &= ~T), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (Gn(a) && gt(a), a.wv > e.wv) return !0;
		}
		t & 512 && xt === null && N(e, m);
	}
	return !1;
}
function Kn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(In !== null && In.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Kn(a, t, !1) : t === a && (n ? N(a, h) : a.f & 1024 && N(a, g), Pt(a));
	}
}
function qn(e) {
	var t = G, n = K, r = Rn, i = U, a = In, o = M, s = Nn, c = Hn, l = e.f;
	G = null, K = 0, Rn = null, U = l & 96 ? null : e, In = null, Ie(e.ctx), Nn = !1, Hn = ++Vn, e.ac !== null && (et(() => {
		e.ac.abort(ue);
	}), e.ac = null);
	try {
		e.f |= E;
		var u = e.fn, d = u();
		e.f |= y;
		var f = e.deps, p = F?.is_fork;
		if (G !== null) {
			var m;
			if (p || Yn(e, K), f !== null && K > 0) for (f.length = K + G.length, m = 0; m < G.length; m++) f[K + m] = G[m];
			else e.deps = f = G;
			if (un() && e.f & 512) for (m = K; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && K < f.length && (Yn(e, K), f.length = K);
		if (ze() && Rn !== null && !Nn && f !== null && !(e.f & 6146)) for (m = 0; m < Rn.length; m++) Kn(Rn[m], e);
		if (i !== null && i !== e) {
			if (Vn++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = Vn;
			if (t !== null) for (let e of t) e.rv = Vn;
			Rn !== null && (r === null ? r = Rn : r.push(...Rn));
		}
		return e.f & 8388608 && (e.f ^= te), d;
	} catch (e) {
		return We(e);
	} finally {
		e.f ^= E, G = t, K = n, Rn = r, U = i, In = a, Ie(o), Nn = s, Hn = c;
	}
}
function Jn(e, r) {
	let i = r.reactions;
	if (i !== null) {
		var a = t.call(i, e);
		if (a !== -1) {
			var o = i.length - 1;
			o === 0 ? i = r.reactions = null : (i[a] = i[o], i.pop());
		}
	}
	if (i === null && r.f & 2 && (G === null || !n.call(G, r))) {
		var s = r;
		s.f & 512 && (s.f ^= 512, s.f &= ~T), s.v !== D && qe(s), s.ac !== null && et(() => {
			s.ac.abort(ue), s.ac = null, N(s, h);
		}), _t(s), Yn(s, 0);
	}
}
function Yn(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) Jn(e, n[r]);
}
function Xn(e) {
	var t = e.f;
	if (!(t & 16384)) {
		N(e, m);
		var n = W, r = An;
		W = e, An = !(t & 96);
		try {
			t & 16777232 ? xn(e) : bn(e), yn(e);
			var i = qn(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = Bn;
		} finally {
			An = r, W = n;
		}
	}
}
async function Zn() {
	await Promise.resolve(), At();
}
function q(e) {
	var t = !!(e.f & 2);
	if (kn?.add(e), U !== null && !Nn && !(W !== null && W.f & 16384) && (In === null || !In.has(e))) {
		var r = U.deps;
		if (U.f & 2097152) e.rv < Vn && (e.rv = Vn, G === null && r !== null && r[K] === e ? K++ : G === null ? G = [e] : G.push(e));
		else {
			U.deps ??= [], n.call(U.deps, e) || U.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [U] : n.call(i, U) || i.push(U);
		}
	}
	if (jn && Rt.has(e)) return Rt.get(e);
	if (t) {
		var a = e;
		if (jn) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || $n(a)) && (o = ht(a)), Rt.set(a, o), o;
		}
		var s = !(a.f & 512) && !Nn && U !== null && (An || !!(U.f & 512)), c = (a.f & y) === 0;
		Gn(a) && (s && (a.f |= 512), gt(a)), s && !c && (vt(a), Qn(a));
	}
	if (xt?.has(e)) return xt.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function Qn(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (vt(t), Qn(t));
}
function $n(e) {
	if (e.v === D) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (Rt.has(t) || t.f & 2 && $n(t)) return !0;
	return !1;
}
function er(e) {
	var t = Nn;
	try {
		return Nn = !0, e();
	} finally {
		Nn = t;
	}
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var tr = ["touchstart", "touchmove"];
function nr(e) {
	return tr.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/events.js
var rr = Symbol("events"), ir = /* @__PURE__ */ new Set(), ar = /* @__PURE__ */ new Set();
function or(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || ur.call(t, e), !e.cancelBubble) return et(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? He(() => {
		t.addEventListener(e, i, r);
	}) : t.addEventListener(e, i, r), i;
}
function sr(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = or(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && dn(() => {
		t.removeEventListener(e, o, a);
	});
}
function J(e, t, n) {
	(t[rr] ??= {})[e] = n;
}
function cr(e) {
	for (var t = 0; t < e.length; t++) ir.add(e[t]);
	for (var n of ar) n(e);
}
var lr = null;
function ur(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	lr = e;
	var s = 0, c = lr === e && e[rr];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[rr] = t;
			return;
		}
		var u = a.indexOf(t);
		if (u === -1) return;
		l <= u && (s = l);
	}
	if (o = a[s] || e.target, o !== t) {
		i(e, "currentTarget", {
			configurable: !0,
			get() {
				return o || n;
			}
		});
		var d = U, f = W;
		Pn(null), Fn(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[rr]?.[r];
					h != null && (!o.disabled || e.target === o) && h.call(o, e);
				} catch (e) {
					p ? m.push(e) : p = e;
				}
				if (e.cancelBubble) break;
				s++, o = s < a.length ? a[s] : null;
			}
			if (p) {
				for (let e of m) queueMicrotask(() => {
					throw e;
				});
				throw p;
			}
		} finally {
			e[rr] = t, delete e.currentTarget, Pn(d), Fn(f);
		}
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/reconciler.js
var dr = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function fr(e) {
	return dr?.createHTML(e) ?? e;
}
function pr(e) {
	var t = an("template");
	return t.innerHTML = fr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/template.js
function mr(e, t) {
	var n = W;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function Y(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (O) return mr(k, null), k;
		i === void 0 && (i = pr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ $t(i)));
		var t = r || Jt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ $t(t), s = t.lastChild;
			mr(o, s);
		} else mr(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function hr(e, t, n = "svg") {
	var r = !e.startsWith("<!>"), i = !!(t & 1), a = `<${n}>${r ? e : "<!>" + e}</${n}>`, o;
	return () => {
		if (O) return mr(k, null), k;
		if (!o) {
			var e = /* @__PURE__ */ $t(pr(a));
			if (i) for (o = document.createDocumentFragment(); /* @__PURE__ */ $t(e);) o.appendChild(/* @__PURE__ */ $t(e));
			else o = /* @__PURE__ */ $t(e);
		}
		var t = o.cloneNode(!0);
		if (i) {
			var n = /* @__PURE__ */ $t(t), r = t.lastChild;
			mr(n, r);
		} else mr(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function gr(e, t) {
	return /* @__PURE__ */ hr(e, t, "svg");
}
function _r() {
	if (O) return mr(k, null), k;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = Qt();
	return e.append(t, n), mr(t, n), e;
}
function X(e, t) {
	if (O) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = k), ke();
		return;
	}
	e !== null && e.before(t);
}
function Z(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[ce] ??= e.nodeValue) && (e[ce] = n, e.nodeValue = `${n}`);
}
function vr(e, t) {
	return br(e, t);
}
var yr = /* @__PURE__ */ new Map();
function br(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	Zt();
	var l = void 0, u = mn(() => {
		var s = n ?? t.appendChild(Qt());
		it(s, { pending: () => {} }, (t) => {
			Le({});
			var n = M;
			if (o && (n.c = o), a && (i.$$events = a), O && mr(t, null), l = e(t, i) || {}, O && (W.nodes.end = k, k === null || k.nodeType !== 8 || k.data !== "]")) throw Ee(), Ce;
			Re();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = nr(r);
					for (let e of [t, document]) {
						var a = yr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), yr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, ur, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(ir)), ar.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = yr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, ur), r.delete(e), r.size === 0 && yr.delete(n)) : r.set(e, i);
			}
			ar.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return xr.set(l, u), l;
}
var xr = /* @__PURE__ */ new WeakMap();
function Sr(e, t) {
	let n = xr.get(e);
	return n ? (xr.delete(e), n(t)) : Promise.resolve();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var Cr = class {
	anchor;
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Set();
	#i = !0;
	constructor(e, t = !0) {
		this.anchor = e, this.#i = t;
	}
	#a = (e) => {
		if (this.#e.has(e)) {
			var t = this.#e.get(e), n = this.#t.get(t);
			if (n) En(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (En(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
			}
			for (let [t, n] of this.#e) {
				if (this.#e.delete(t), t === e) break;
				let r = this.#n.get(n);
				r && (H(r.effect), this.#n.delete(n));
			}
			for (let [e, r] of this.#t) {
				if (e === t || this.#r.has(e)) continue;
				let i = () => {
					if (Array.from(this.#e.values()).includes(e)) {
						var t = document.createDocumentFragment();
						On(r, t), t.append(Qt()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else H(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), wn(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (H(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = F, r = rn();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = Qt();
				i.append(a), this.#n.set(e, {
					effect: V(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, V(() => t(this.anchor)));
		}
		if (this.#e.set(n, e), r) {
			for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(this.#a), n.ondiscard(this.#o);
		} else O && (this.anchor = k), this.#a(n);
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/if.js
function Q(e, t, n = !1) {
	var r;
	O && (r = k, ke());
	var i = new Cr(e), a = n ? x : 0;
	function o(e, t) {
		if (O) {
			var n = Me(r);
			if (e !== parseInt(n.substring(1))) {
				var a = je();
				A(a), i.anchor = a, Oe(!1), i.ensure(e, t), Oe(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	vn(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/each.js
function wr(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		wn(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					Tr(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = i.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			nn(d), d.append(u), e.items.clear();
		}
		Tr(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function Tr(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= w, On(a, document.createDocumentFragment())) : H(t[i], n);
	}
}
var Er;
function Dr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = O ? A(/* @__PURE__ */ $t(u)) : u.appendChild(Qt());
	}
	O && ke();
	var d = null, f = /* @__PURE__ */ pt(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, kr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= w, jr(d, null, c)) : En(d) : wn(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: vn(() => {
			p = q(f);
			var e = p.length;
			let t = !1;
			O && Me(c) === "[!" != (e === 0) && (c = je(), A(c), Oe(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = F, v = rn(), y = 0; y < e; y += 1) {
				O && k.nodeType === 8 && k.data === "]" && (c = k, t = !0, Oe(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Ht(S.v, b), S.i && Ht(S.i, y), v && u.unskip_effect(S.e)) : (S = Ar(l, h ? c : Er ??= Qt(), b, x, y, o, n, i), h || (S.e.f |= w), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = V(() => s(c)) : (d = V(() => s(Er ??= Qt())), d.f |= w)), e > r.size && pe("", "", ""), O && e > 0 && A(je()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && Oe(!0), q(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, O && (c = k);
}
function Or(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function kr(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = Or(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (En(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= w, _ === l) jr(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), Mr(e, d, _), Mr(e, _, y), jr(_, y, n), d = _, p = [], m = [], l = Or(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], C = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) jr(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					Mr(e, S.prev, C.next), Mr(e, d, S), Mr(e, C, b), l = b, d = C, --v, p = [], m = [];
				} else u.delete(_), jr(_, l, n), Mr(e, _.prev, _.next), Mr(e, _, d === null ? e.effect.first : d.next), Mr(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = Or(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = Or(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (Tr(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var T = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || T.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && T.push(l), l = Or(l.next);
		var E = T.length;
		if (E > 0) {
			var ee = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < E; v += 1) T[v].nodes?.a?.measure();
				for (v = 0; v < E; v += 1) T[v].nodes?.a?.fix();
			}
			wr(e, T, ee);
		}
	}
	o && He(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function Ar(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Bt(n) : /* @__PURE__ */ Vt(n, !1, !1) : null, l = o & 2 ? Bt(i) : null;
	return {
		v: c,
		i: l,
		e: V(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function jr(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ en(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function Mr(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/attributes.js
var Nr = [..." 	\n\r\f\xA0\v﻿"];
function Pr(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || Nr.includes(r[o - 1])) && (s === r.length || Nr.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
function Fr(e, t = !1) {
	var n = t ? " !important;" : ";", r = "";
	for (var i of Object.keys(e)) {
		var a = e[i];
		a != null && a !== "" && (r += " " + i + ": " + a + n);
	}
	return r;
}
function Ir(e) {
	return e[0] !== "-" || e[1] !== "-" ? e.toLowerCase() : e;
}
function Lr(e, t) {
	if (t) {
		var n = "", r, i;
		if (Array.isArray(t) ? (r = t[0], i = t[1]) : r = t, e) {
			e = String(e).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
			var a = !1, o = 0, s = !1, c = [];
			r && c.push(...Object.keys(r).map(Ir)), i && c.push(...Object.keys(i).map(Ir));
			var l = 0, u = -1;
			let t = e.length;
			for (var d = 0; d < t; d++) {
				var f = e[d];
				if (s ? f === "/" && e[d - 1] === "*" && (s = !1) : a ? a === f && (a = !1) : f === "/" && e[d + 1] === "*" ? s = !0 : f === "\"" || f === "'" ? a = f : f === "(" ? o++ : f === ")" && o--, !s && a === !1 && o === 0) {
					if (f === ":" && u === -1) u = d;
					else if (f === ";" || d === t - 1) {
						if (u !== -1) {
							var p = Ir(e.substring(l, u).trim());
							if (!c.includes(p)) {
								f !== ";" && d++;
								var m = e.substring(l, d).trim();
								n += " " + m + ";";
							}
						}
						l = d + 1, u = -1;
					}
				}
			}
		}
		return r && (n += Fr(r)), i && (n += Fr(i, !0)), n = n.trim(), n === "" ? null : n;
	}
	return e == null ? null : String(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/class.js
function Rr(e, t, n, r, i, a) {
	var o = e[oe];
	if (O || o !== n || o === void 0) {
		var s = Pr(n, r, a);
		(!O || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[oe] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/style.js
function zr(e, t = {}, n, r) {
	for (var i in n) {
		var a = n[i];
		t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
	}
}
function Br(e, t, n, r) {
	var i = e[se];
	if (O || i !== t) {
		var a = Lr(t, r);
		(!O || a !== e.getAttribute("style")) && (a == null ? e.removeAttribute("style") : e.style.cssText = a), e[se] = t;
	} else r && (Array.isArray(r) ? (zr(e, n?.[0], r[0]), zr(e, n?.[1], r[1], "important")) : zr(e, n, r));
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var Vr = Symbol("is custom element"), Hr = Symbol("is html"), Ur = de ? "link" : "LINK", Wr = de ? "progress" : "PROGRESS";
function Gr(e) {
	if (O) {
		var t = !1, n = () => {
			if (!t) {
				if (t = !0, e.hasAttribute("value")) {
					var n = e.value;
					Jr(e, "value", null), e.value = n;
				}
				if (e.hasAttribute("checked")) {
					var r = e.checked;
					Jr(e, "checked", null), e.checked = r;
				}
			}
		};
		e[le] = n, He(n), $e();
	}
}
function Kr(e, t) {
	var n = Yr(e);
	n.value !== (n.value = t ?? void 0) && (e.value !== t || t === 0 && e.nodeName === Wr) && (e.value = t ?? "");
}
function qr(e, t) {
	var n = Yr(e);
	n.checked !== (n.checked = t ?? void 0) && (e.checked = t);
}
function Jr(e, t, n, r) {
	var i = Yr(e);
	O && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Ur) || i[t] !== (i[t] = n) && (t === "loading" && (e[ie] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && Zr(e).includes(t) ? e[t] = n : e.setAttribute(t, n));
}
function Yr(e) {
	return e[ae] ??= {
		[Vr]: e.nodeName.includes("-"),
		[Hr]: e.namespaceURI === we
	};
}
var Xr = /* @__PURE__ */ new Map();
function Zr(e) {
	var t = e.getAttribute("is") || e.nodeName, n = Xr.get(t);
	if (n) return n;
	Xr.set(t, n = []);
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.push(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
function Qr(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet();
	tt(e, "input", async (i) => {
		var a = i ? e.defaultValue : e.value;
		if (a = $r(e) ? ei(a) : a, n(a), F !== null && r.add(F), await Zn(), a !== (a = t())) {
			var o = e.selectionStart, s = e.selectionEnd, c = e.value.length;
			if (e.value = a ?? "", s !== null) {
				var l = e.value.length;
				o === s && s === c && l > c ? (e.selectionStart = l, e.selectionEnd = l) : (e.selectionStart = o, e.selectionEnd = Math.min(s, l));
			}
		}
	}), (O && e.defaultValue !== e.value || er(t) == null && e.value) && (n($r(e) ? ei(e.value) : e.value), F !== null && r.add(F)), _n(() => {
		var n = t();
		if (e === document.activeElement) {
			var i = F;
			if (r.has(i)) return;
		}
		$r(e) && n === ei(e.value) || e.type === "date" && !n && !e.value || n !== e.value && (e.value = n ?? "");
	});
}
function $r(e) {
	var t = e.type;
	return t === "number" || t === "range";
}
function ei(e) {
	return e === "" ? null : +e;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function ti(e, t) {
	return e === t || e?.[ne] === t;
}
function ni(e = {}, t, n, r) {
	var i = M.r, a = W;
	return hn(() => {
		var o, s;
		return _n(() => {
			o = s, s = r?.() || [], er(() => {
				ti(n(...s), e) || (t(e, ...s), o && ti(n(...o), e) && t(null, ...o));
			});
		}), () => {
			let r = a;
			for (; r !== i && r.parent !== null && r.parent.f & 33554432;) r = r.parent;
			let o = () => {
				s && ti(n(...s), e) && t(null, ...s);
			}, c = r.teardown;
			r.teardown = () => {
				o(), c?.();
			};
		};
	}), e;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/props.js
function ri(e, t, n, r) {
	var i = !0, o = !!(n & 8), s = !!(n & 16), c = r, l = !0, u = void 0, d = () => s && i ? (u ??= /* @__PURE__ */ ut(r), q(u)) : (l && (l = !1, c = s ? er(r) : r), c);
	let f;
	if (o) {
		var p = ne in e || re in e;
		f = a(e, t)?.set ?? (p && t in e ? (n) => e[t] = n : void 0);
	}
	var m, h = !1;
	o ? [m, h] = Ze(() => e[t]) : m = e[t], m === void 0 && r !== void 0 && (m = d(), f && (i && ve(t), f(m)));
	var g = i ? () => {
		var n = e[t];
		return n === void 0 ? d() : (l = !0, n);
	} : () => {
		var n = e[t];
		return n !== void 0 && (c = void 0), n === void 0 ? c : n;
	};
	if (i && !(n & 4)) return g;
	if (f) {
		var _ = e.$$legacy;
		return (function(e, t) {
			return arguments.length > 0 ? ((!i || !t || _ || h) && f(t ? g() : e), e) : g();
		});
	}
	var v = !1, y = (n & 1 ? ut : pt)(() => (v = !1, g()));
	o && q(y);
	var b = W;
	return (function(e, t) {
		if (arguments.length > 0) {
			let n = t ? q(y) : i && o ? Kt(e) : e;
			return L(y, n), v = !0, c !== void 0 && (c = n), e;
		}
		return jn && v || b.f & 16384 ? y.v : q(y);
	});
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region quicksettings/src/icons.ts
var ii = {
	wifi: "M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0M12 19h.01",
	wifiMedium: "M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0M12 19h.01",
	wifiLow: "M8.5 15.5a6 6 0 0 1 7 0M12 19h.01",
	wifiOff: "M3 3l18 18M8.5 15.5a6 6 0 0 1 7 0M12 19h.01M2 8.5a16 16 0 0 1 6-3.6",
	lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z",
	bluetooth: "M7 7.5l10 9L12 21V3l5 4.5-10 9",
	camera: "M4 7h3l1.5-2h7L17 7h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
	moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z",
	cast: "M3 18h.01M3 14a7 7 0 0 1 7 7M3 10a11 11 0 0 1 11 11M4 5h16v10h-6",
	share: "M17 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9.2 10.8l5.6-2.9M9.2 13.2l5.6 2.9",
	keyboard: "M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14h8",
	volume: "M4 9v6h3.5L12 19V5L7.5 9zM16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10",
	volumeMuted: "M4 9v6h3.5L12 19V5L7.5 9zM17 10l4 4M21 10l-4 4",
	sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
	power: "M12 3v9M7.5 6.5a7.5 7.5 0 1 0 9 0",
	chevronRight: "M9 5l7 7-7 7",
	chevronLeft: "M15 5l-7 7 7 7",
	chevronDown: "M6 9l6 6 6-6",
	check: "M4 12.5l5 5L20 6.5",
	refresh: "M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5",
	battery: "M2 8h16v8H2zM20 11v2",
	headset: "M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2zM20 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z",
	mouse: "M12 2a6 6 0 0 1 6 6v8a6 6 0 0 1-12 0V8a6 6 0 0 1 6-6zM12 6v4",
	phone: "M7 2h10v20H7zM11 18.5h2",
	speaker: "M5 2h14v20H5zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 6h.01",
	device: "M4 5h16v11H4zM9 20h6M12 16v4"
}, ai = {
	"audio-headset": "headset",
	"audio-headphones": "headset",
	"audio-card": "speaker",
	"input-mouse": "mouse",
	"input-keyboard": "keyboard",
	phone: "phone",
	computer: "device"
};
function oi(e) {
	let t = ai[e];
	return t === void 0 ? "bluetooth" : t;
}
function si(e, t) {
	return t ? e >= 66 ? "wifi" : e >= 33 ? "wifiMedium" : "wifiLow" : "wifiOff";
}
function ci(e) {
	return e >= 75 ? "Strong" : e >= 50 ? "Good" : e >= 25 ? "Weak" : "Very weak";
}
//#endregion
//#region quicksettings/src/Icon.svelte
var li = /* @__PURE__ */ gr("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"shrink-0\" aria-hidden=\"true\"><path></path></svg>");
function $(e, t) {
	Le(t, !0);
	let n = ri(t, "size", 3, 20), r = /* @__PURE__ */ P(() => i(t.name));
	function i(e) {
		let t = ii[e];
		return t === void 0 ? ii.device : t;
	}
	var a = li(), o = R(a);
	j(a), B(() => {
		Jr(a, "width", n()), Jr(a, "height", n()), Jr(o, "d", q(r));
	}), X(e, a), Re();
}
//#endregion
//#region quicksettings/src/Tile.svelte
var ui = /* @__PURE__ */ Y("<button type=\"button\"><span><!></span> <span class=\"text-[9.5px] leading-[1.15]\"> </span></button>"), di = /* @__PURE__ */ Y("<span class=\"block truncate text-[10px] leading-tight opacity-55\"> </span>"), fi = /* @__PURE__ */ Y("<button type=\"button\" class=\"flex h-full items-center pr-2 pl-1 opacity-45 transition-opacity\n          hover:opacity-100\"><!></button>"), pi = /* @__PURE__ */ Y("<span class=\"w-2.5\"></span>"), mi = /* @__PURE__ */ Y("<div><button type=\"button\" class=\"flex h-full min-w-0 flex-1 items-center gap-2.5 pl-2.5 text-left\"><span><!></span> <span class=\"min-w-0 flex-1\"><span class=\"block truncate text-[12px] leading-tight font-medium\"> </span> <!></span></button> <!></div>");
function hi(e, t) {
	Le(t, !0);
	let n = ri(t, "subtitle", 3, ""), r = ri(t, "active", 3, !1), i = ri(t, "disabled", 3, !1), a = ri(t, "compact", 3, !1), o = /* @__PURE__ */ P(() => c(r(), i())), s = /* @__PURE__ */ P(() => l(r(), i()));
	function c(e, t) {
		return t ? "bg-base-300/50 opacity-45" : e ? "bg-info/20 hover:bg-info/25" : "bg-base-300/80 hover:bg-base-300";
	}
	function l(e, t) {
		return t ? "bg-base-content/10 text-base-content/60" : e ? "bg-info text-info-content" : "bg-base-content/10 text-base-content/70";
	}
	function u() {
		i() || t.onActivate === void 0 || t.onActivate();
	}
	function d() {
		i() || t.onOpen === void 0 || t.onOpen();
	}
	var f = _r(), p = tn(f), m = (e) => {
		var n = ui(), r = R(n);
		$(R(r), {
			get name() {
				return t.icon;
			},
			size: 17
		}), j(r);
		var a = z(r, 2), c = R(a, !0);
		j(a), j(n), B(() => {
			Rr(n, 1, `flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl px-1
      text-center transition-colors ${q(o) ?? ""}`), n.disabled = i(), Rr(r, 1, `flex h-8 w-8 items-center justify-center rounded-full ${q(s) ?? ""}`), Z(c, t.title);
		}), J("click", n, u), X(e, n);
	}, h = (e) => {
		var r = mi(), a = R(r), c = R(a);
		$(R(c), {
			get name() {
				return t.icon;
			},
			size: 17
		}), j(c);
		var l = z(c, 2), f = R(l), p = R(f, !0);
		j(f);
		var m = z(f, 2), h = (e) => {
			var t = di(), r = R(t, !0);
			j(t), B(() => Z(r, n())), X(e, t);
		};
		Q(m, (e) => {
			n() !== "" && e(h);
		}), j(l), j(a);
		var g = z(a, 2), _ = (e) => {
			var n = fi();
			$(R(n), {
				name: "chevronRight",
				size: 15
			}), j(n), B(() => {
				n.disabled = i(), Jr(n, "aria-label", `Open ${t.title ?? ""} settings`);
			}), J("click", n, d), X(e, n);
		}, v = (e) => {
			X(e, pi());
		};
		Q(g, (e) => {
			t.onOpen === void 0 ? e(v, -1) : e(_);
		}), j(r), B(() => {
			Rr(r, 1, `flex h-14 items-center rounded-2xl transition-colors ${q(o) ?? ""}`), a.disabled = i(), Rr(c, 1, `flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${q(s) ?? ""}`), Z(p, t.title);
		}), J("click", a, u), X(e, r);
	};
	Q(p, (e) => {
		a() ? e(m) : e(h, -1);
	}), X(e, f), Re();
}
cr(["click"]);
//#endregion
//#region quicksettings/src/SliderRow.svelte
var gi = /* @__PURE__ */ Y("<div class=\"relative h-8\"><input type=\"range\" min=\"0\" max=\"100\" step=\"1\" class=\"slider h-8 w-full svelte-3gn0pp\"/> <button type=\"button\"><!></button></div>");
function _i(e, t) {
	Le(t, !0);
	let n = ri(t, "disabled", 3, !1), r = /* @__PURE__ */ P(() => t.onIconClick !== void 0 && !n());
	function i(e) {
		let n = e.currentTarget;
		t.onInput(Number(n.value));
	}
	function a() {
		t.onIconClick === void 0 || n() || t.onIconClick();
	}
	function o(e) {
		return e ? "pointer-events-auto cursor-pointer" : "pointer-events-none";
	}
	var s = gi(), c = R(s);
	Gr(c);
	let l;
	var u = z(c, 2);
	Jr(u, "tabindex", -1), $(R(u), {
		get name() {
			return t.icon;
		},
		size: 17
	}), j(u), j(s), B((e) => {
		Jr(c, "aria-label", t.label), Kr(c, t.value), c.disabled = n(), l = Br(c, "", l, { "--fill": `${t.value ?? ""}%` }), Rr(u, 1, `absolute inset-y-0 left-0 flex w-9 items-center justify-center
      text-base-content/80 disabled:opacity-40 ${e ?? ""}`, "svelte-3gn0pp"), Jr(u, "aria-hidden", !q(r)), u.disabled = n();
	}, [() => o(q(r))]), J("input", c, i), J("click", u, a), X(e, s), Re();
}
cr(["input", "click"]);
//#endregion
//#region quicksettings/src/lib.ts
function vi(e) {
	return typeof e != "object" || !e ? {} : e;
}
function yi(e) {
	return Array.isArray(e) ? e.map(vi) : [];
}
function bi(e) {
	return typeof e == "string" ? e : "";
}
function xi(e, t) {
	return typeof e == "number" ? e : t;
}
function Si(e) {
	let t = vi(e).error;
	return typeof t == "string" ? t : "";
}
function Ci(e, t) {
	let n = e.get(t);
	if (n === void 0) throw Error(`views: service "${t}" is not available`);
	return n;
}
//#endregion
//#region quicksettings/src/WifiPage.svelte
var wi = /* @__PURE__ */ Y("<button type=\"button\" class=\"flex h-8 w-8 items-center justify-center rounded-full transition-colors\n          hover:bg-base-content/10 disabled:opacity-30\" aria-label=\"Scan for networks\"><!></button> <input type=\"checkbox\" class=\"toggle toggle-sm toggle-info\" aria-label=\"Wi-Fi enabled\"/>", 1), Ti = /* @__PURE__ */ Y("<p class=\"rounded-lg bg-error/15 px-3 py-2 text-[11px] text-error\"> </p>"), Ei = /* @__PURE__ */ Y("<p class=\"px-1 py-6 text-center text-[12px] text-base-content/50\">No Wi-Fi device on this machine.</p>"), Di = /* @__PURE__ */ Y("<p class=\"px-1 py-6 text-center text-[12px] text-base-content/50\">Wi-Fi is off.</p>"), Oi = /* @__PURE__ */ Y("<p class=\"px-1 py-6 text-center text-[12px] text-base-content/50\">No networks found.</p>"), ki = /* @__PURE__ */ Y("<span class=\"block text-[10px] leading-tight text-info\">Connected</span>"), Ai = /* @__PURE__ */ Y("<span class=\"block text-[10px] leading-tight opacity-50\">Saved</span>"), ji = /* @__PURE__ */ Y("<button type=\"button\"><!> <span class=\"min-w-0 flex-1\"><span class=\"block truncate text-[12px] leading-tight\"> </span> <!></span> <!> <!></button>"), Mi = /* @__PURE__ */ Y("<div class=\"-mr-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto pr-1\"></div>"), Ni = /* @__PURE__ */ Y("<form class=\"flex flex-col gap-3\"><p class=\"text-[11px] text-base-content/60\"> </p> <input type=\"password\" class=\"input input-sm w-full bg-base-300 text-[12px]\" placeholder=\"Password\" autocomplete=\"off\"/> <div class=\"flex justify-end gap-2\"><button type=\"button\" class=\"btn btn-ghost btn-sm text-[12px]\">Cancel</button> <button type=\"submit\" class=\"btn btn-sm btn-info text-[12px]\">Connect</button></div></form>"), Pi = /* @__PURE__ */ Y("<dl class=\"flex flex-col gap-1.5 rounded-xl bg-base-300/60 px-3 py-2.5 text-[11px]\"><div class=\"flex justify-between gap-3\"><dt class=\"opacity-50\">Signal</dt> <dd class=\"tabular-nums\"> </dd></div> <div class=\"flex justify-between gap-3\"><dt class=\"opacity-50\">Security</dt> <dd> </dd></div> <div class=\"flex justify-between gap-3\"><dt class=\"opacity-50\">IPv4</dt> <dd class=\"truncate tabular-nums\"> </dd></div> <div class=\"flex justify-between gap-3\"><dt class=\"opacity-50\">Gateway</dt> <dd class=\"truncate tabular-nums\"> </dd></div> <div class=\"flex justify-between gap-3\"><dt class=\"opacity-50\">DNS</dt> <dd class=\"truncate tabular-nums\"> </dd></div> <div class=\"flex justify-between gap-3\"><dt class=\"opacity-50\">Interface</dt> <dd class=\"tabular-nums\"> </dd></div></dl> <div class=\"flex justify-end gap-2\"><button type=\"button\" class=\"btn btn-ghost btn-sm text-[12px]\">Forget</button> <button type=\"button\" class=\"btn btn-sm text-[12px]\">Disconnect</button></div>", 1), Fi = /* @__PURE__ */ Y("<div class=\"flex min-h-0 flex-col gap-3\"><div class=\"flex items-center gap-2\"><button type=\"button\" class=\"flex h-8 w-8 items-center justify-center rounded-full transition-colors\n        hover:bg-base-content/10\" aria-label=\"Back\"><!></button> <span class=\"min-w-0 flex-1 truncate text-[14px] font-medium\"> </span> <!></div> <!> <!> <!> <!></div>");
function Ii(e, t) {
	Le(t, !0);
	let n = /* @__PURE__ */ I("list"), r = /* @__PURE__ */ I(null), i = /* @__PURE__ */ I(""), a = /* @__PURE__ */ I(!1), o = /* @__PURE__ */ I(""), s = /* @__PURE__ */ I(null), c = /* @__PURE__ */ P(() => l(q(n), q(r)));
	fn(() => {
		q(n) === "password" && q(s) !== null && q(s).focus();
	});
	function l(e, t) {
		return e === "list" || t === null ? "Wi-Fi" : t.ssid;
	}
	function u() {
		L(n, "list"), L(r, null), L(i, ""), L(o, "");
	}
	function d() {
		if (q(n) === "list") {
			t.onBack();
			return;
		}
		u();
	}
	function f(e) {
		if (L(o, ""), L(r, e, !0), e.active) {
			L(n, "details");
			return;
		}
		if (e.secured && !e.saved) {
			L(i, ""), L(n, "password");
			return;
		}
		p(e.ssid, "");
	}
	async function p(e, n) {
		L(a, !0), L(o, "");
		let r = await t.bus.call("network:connect", {
			ssid: e,
			password: n
		}, 45e3);
		L(a, !1);
		let i = Si(r);
		if (i !== "") {
			L(o, i, !0);
			return;
		}
		u();
	}
	function m(e) {
		e.preventDefault(), q(r) !== null && q(i) !== "" && p(q(r).ssid, q(i));
	}
	async function h(e, n) {
		L(a, !0), L(o, "");
		let r = await t.bus.call(e, n, 3e4);
		L(a, !1), L(o, Si(r), !0);
	}
	function g() {
		h("network:enable", { enabled: !t.networkState.enabled });
	}
	function _() {
		h("network:scan", {});
	}
	function v() {
		h("network:disconnect", {}), u();
	}
	function y() {
		q(r) !== null && (h("network:forget", { ssid: q(r).ssid }), u());
	}
	function b(e) {
		return e.active ? "bg-info/20" : "hover:bg-base-content/10";
	}
	function x(e) {
		return e ? "Protected" : "Open";
	}
	var S = Fi(), C = R(S), w = R(C);
	$(R(w), {
		name: "chevronLeft",
		size: 18
	}), j(w);
	var T = z(w, 2), E = R(T, !0);
	j(T);
	var ee = z(T, 2), te = (e) => {
		var n = wi(), r = tn(n);
		$(R(r), {
			name: "refresh",
			size: 16
		}), j(r);
		var i = z(r, 2);
		Gr(i), B(() => {
			r.disabled = q(a) || !t.networkState.enabled, qr(i, t.networkState.enabled), i.disabled = q(a) || !t.networkState.available;
		}), J("click", r, _), J("change", i, g), X(e, n);
	};
	Q(ee, (e) => {
		q(n) === "list" && e(te);
	}), j(C);
	var ne = z(C, 2), re = (e) => {
		var t = Ti(), n = R(t, !0);
		j(t), B(() => Z(n, q(o))), X(e, t);
	};
	Q(ne, (e) => {
		q(o) !== "" && e(re);
	});
	var ie = z(ne, 2), ae = (e) => {
		var n = _r(), r = tn(n), i = (e) => {
			X(e, Ei());
		}, o = (e) => {
			X(e, Di());
		}, s = (e) => {
			X(e, Oi());
		}, c = (e) => {
			var n = Mi();
			Dr(n, 21, () => t.networks, (e) => e.ssid, (e, t) => {
				var n = ji(), r = R(n);
				{
					let e = /* @__PURE__ */ P(() => si(q(t).signal, !0));
					$(r, { get name() {
						return q(e);
					} });
				}
				var i = z(r, 2), o = R(i), s = R(o, !0);
				j(o);
				var c = z(o, 2), l = (e) => {
					X(e, ki());
				}, u = (e) => {
					X(e, Ai());
				};
				Q(c, (e) => {
					q(t).active ? e(l) : q(t).saved && e(u, 1);
				}), j(i);
				var d = z(i, 2), p = (e) => {
					$(e, {
						name: "lock",
						size: 13
					});
				};
				Q(d, (e) => {
					q(t).secured && e(p);
				}), $(z(d, 2), {
					name: "chevronRight",
					size: 14
				}), j(n), B((e) => {
					Rr(n, 1, `flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors
              disabled:opacity-40 ${e ?? ""}`), n.disabled = q(a), Z(s, q(t).ssid);
				}, [() => b(q(t))]), J("click", n, () => f(q(t))), X(e, n);
			}), j(n), X(e, n);
		};
		Q(r, (e) => {
			t.networkState.available ? t.networkState.enabled ? t.networks.length === 0 ? e(s, 2) : e(c, -1) : e(o, 1) : e(i);
		}), X(e, n);
	};
	Q(ie, (e) => {
		q(n) === "list" && e(ae);
	});
	var oe = z(ie, 2), se = (e) => {
		var t = Ni(), n = R(t), o = R(n);
		j(n);
		var c = z(n, 2);
		Gr(c), ni(c, (e) => L(s, e), () => q(s));
		var l = z(c, 2), d = R(l), f = z(d, 2);
		j(l), j(t), B(() => {
			Z(o, `Enter the password for ${q(r).ssid ?? ""}.`), c.disabled = q(a), f.disabled = q(a) || q(i) === "";
		}), sr("submit", t, m), Qr(c, () => q(i), (e) => L(i, e)), J("click", d, u), X(e, t);
	};
	Q(oe, (e) => {
		q(n) === "password" && q(r) !== null && e(se);
	});
	var ce = z(oe, 2), le = (e) => {
		var n = Pi(), r = tn(n), i = R(r), o = z(R(i), 2), s = R(o);
		j(o), j(i);
		var c = z(i, 2), l = z(R(c), 2), u = R(l, !0);
		j(l), j(c);
		var d = z(c, 2), f = z(R(d), 2), p = R(f, !0);
		j(f), j(d);
		var m = z(d, 2), h = z(R(m), 2), g = R(h, !0);
		j(h), j(m);
		var _ = z(m, 2), b = z(R(_), 2), S = R(b, !0);
		j(b), j(_);
		var C = z(_, 2), w = z(R(C), 2), T = R(w, !0);
		j(w), j(C), j(r);
		var E = z(r, 2), ee = R(E), te = z(ee, 2);
		j(E), B((e, n, r) => {
			Z(s, `${e ?? ""} · ${t.networkState.signal ?? ""}%`), Z(u, n), Z(p, t.networkState.ipv4), Z(g, t.networkState.gateway), Z(S, r), Z(T, t.networkState.device), ee.disabled = q(a), te.disabled = q(a);
		}, [
			() => ci(t.networkState.signal),
			() => x(t.networkState.secured),
			() => t.networkState.dns.join(", ")
		]), J("click", ee, y), J("click", te, v), X(e, n);
	};
	Q(ce, (e) => {
		q(n) === "details" && q(r) !== null && e(le);
	}), j(S), B(() => Z(E, q(c))), J("click", w, d), X(e, S), Re();
}
cr(["click", "change"]);
//#endregion
//#region quicksettings/src/BluetoothPage.svelte
var Li = /* @__PURE__ */ Y("<p class=\"rounded-lg bg-error/15 px-3 py-2 text-[11px] text-error\"> </p>"), Ri = /* @__PURE__ */ Y("<p class=\"px-1 py-6 text-center text-[12px] text-base-content/50\">No Bluetooth adapter on this machine.</p>"), zi = /* @__PURE__ */ Y("<p class=\"px-1 py-6 text-center text-[12px] text-base-content/50\">Bluetooth is off.</p>"), Bi = /* @__PURE__ */ Y("<span class=\"loading loading-spinner loading-xs\"></span>"), Vi = /* @__PURE__ */ Y("<div><button type=\"button\" class=\"flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2 text-left\n                  disabled:opacity-40\"><!> <span class=\"min-w-0 flex-1\"><span class=\"block truncate text-[12px] leading-tight\"> </span> <span class=\"block text-[10px] leading-tight opacity-50\"> </span></span> <!></button> <button type=\"button\" class=\"px-2.5 py-2 text-[10px] opacity-40 transition-opacity hover:opacity-100\">Forget</button></div>"), Hi = /* @__PURE__ */ Y("<div class=\"flex flex-col gap-0.5\"><p class=\"px-2.5 py-1 text-[10px] tracking-wide uppercase opacity-40\">Your devices</p> <!></div>"), Ui = /* @__PURE__ */ Y("<p class=\"px-2.5 py-2 text-[11px] opacity-40\">Nothing found yet — start a scan.</p>"), Wi = /* @__PURE__ */ Y("<span class=\"text-[10px] opacity-40\">Pair</span>"), Gi = /* @__PURE__ */ Y("<button type=\"button\" class=\"flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors\n              disabled:opacity-40 hover:bg-base-content/10\"><!> <span class=\"min-w-0 flex-1 truncate text-[12px]\"> </span> <!></button>"), Ki = /* @__PURE__ */ Y("<div class=\"-mr-1 flex max-h-64 flex-col gap-3 overflow-y-auto pr-1\"><!> <div class=\"flex flex-col gap-0.5\"><p class=\"px-2.5 py-1 text-[10px] tracking-wide uppercase opacity-40\">Nearby</p> <!> <!></div></div>"), qi = /* @__PURE__ */ Y("<div class=\"flex min-h-0 flex-col gap-3\"><div class=\"flex items-center gap-2\"><button type=\"button\" class=\"flex h-8 w-8 items-center justify-center rounded-full transition-colors\n        hover:bg-base-content/10\" aria-label=\"Back\"><!></button> <span class=\"min-w-0 flex-1 truncate text-[14px] font-medium\">Bluetooth</span> <button type=\"button\" class=\"flex h-8 w-8 items-center justify-center rounded-full transition-colors\n        hover:bg-base-content/10 disabled:opacity-30\" aria-label=\"Scan for devices\"><!></button> <input type=\"checkbox\" class=\"toggle toggle-sm toggle-info\" aria-label=\"Bluetooth enabled\"/></div> <!> <!></div>");
function Ji(e, t) {
	Le(t, !0);
	let n = /* @__PURE__ */ I(!1), r = /* @__PURE__ */ I(""), i = /* @__PURE__ */ I(""), a = /* @__PURE__ */ P(() => t.devices.filter((e) => e.paired)), o = /* @__PURE__ */ P(() => t.devices.filter((e) => !e.paired));
	async function s(e, a, o) {
		L(n, !0), L(i, o, !0), L(r, "");
		let s = await t.bus.call(e, a, 6e4);
		L(n, !1), L(i, ""), L(r, Si(s), !0);
	}
	function c() {
		s("bluetooth:power", { powered: !t.bluetoothState.powered }, "");
	}
	function l() {
		s("bluetooth:scan", {}, "");
	}
	function u(e) {
		if (!e.paired) {
			s("bluetooth:pair", { mac: e.mac }, e.mac);
			return;
		}
		if (e.connected) {
			s("bluetooth:disconnect", { mac: e.mac }, e.mac);
			return;
		}
		s("bluetooth:connect", { mac: e.mac }, e.mac);
	}
	function d(e) {
		s("bluetooth:forget", { mac: e.mac }, e.mac);
	}
	function f(e) {
		return e.connected && e.battery >= 0 ? `Connected · ${e.battery}%` : e.connected ? "Connected" : e.paired ? "Paired" : "";
	}
	function p(e) {
		return e.connected ? "bg-info/20" : "hover:bg-base-content/10";
	}
	var m = qi(), h = R(m), g = R(h);
	$(R(g), {
		name: "chevronLeft",
		size: 18
	}), j(g);
	var _ = z(g, 4);
	$(R(_), {
		name: "refresh",
		size: 16
	}), j(_);
	var v = z(_, 2);
	Gr(v), j(h);
	var y = z(h, 2), b = (e) => {
		var t = Li(), n = R(t, !0);
		j(t), B(() => Z(n, q(r))), X(e, t);
	};
	Q(y, (e) => {
		q(r) !== "" && e(b);
	});
	var x = z(y, 2), S = (e) => {
		X(e, Ri());
	}, C = (e) => {
		X(e, zi());
	}, w = (e) => {
		var t = Ki(), r = R(t), s = (e) => {
			var t = Hi();
			Dr(z(R(t), 2), 17, () => q(a), (e) => e.mac, (e, t) => {
				var r = Vi(), a = R(r), o = R(a);
				{
					let e = /* @__PURE__ */ P(() => oi(q(t).icon));
					$(o, { get name() {
						return q(e);
					} });
				}
				var s = z(o, 2), c = R(s), l = R(c, !0);
				j(c);
				var m = z(c, 2), h = R(m, !0);
				j(m), j(s);
				var g = z(s, 2), _ = (e) => {
					X(e, Bi());
				};
				Q(g, (e) => {
					q(i) === q(t).mac && e(_);
				}), j(a);
				var v = z(a, 2);
				j(r), B((e, i) => {
					Rr(r, 1, `flex items-center rounded-xl transition-colors ${e ?? ""}`), a.disabled = q(n), Z(l, q(t).name), Z(h, i), v.disabled = q(n);
				}, [() => p(q(t)), () => f(q(t))]), J("click", a, () => u(q(t))), J("click", v, () => d(q(t))), X(e, r);
			}), j(t), X(e, t);
		};
		Q(r, (e) => {
			q(a).length > 0 && e(s);
		});
		var c = z(r, 2), l = z(R(c), 2), m = (e) => {
			X(e, Ui());
		};
		Q(l, (e) => {
			q(o).length === 0 && e(m);
		}), Dr(z(l, 2), 17, () => q(o), (e) => e.mac, (e, t) => {
			var r = Gi(), a = R(r);
			{
				let e = /* @__PURE__ */ P(() => oi(q(t).icon));
				$(a, { get name() {
					return q(e);
				} });
			}
			var o = z(a, 2), s = R(o, !0);
			j(o);
			var c = z(o, 2), l = (e) => {
				X(e, Bi());
			}, d = (e) => {
				X(e, Wi());
			};
			Q(c, (e) => {
				q(i) === q(t).mac ? e(l) : e(d, -1);
			}), j(r), B(() => {
				r.disabled = q(n), Z(s, q(t).name);
			}), J("click", r, () => u(q(t))), X(e, r);
		}), j(c), j(t), X(e, t);
	};
	Q(x, (e) => {
		t.bluetoothState.available ? t.bluetoothState.powered ? e(w, -1) : e(C, 1) : e(S);
	}), j(m), B(() => {
		_.disabled = q(n) || !t.bluetoothState.powered, qr(v, t.bluetoothState.powered), v.disabled = q(n) || !t.bluetoothState.available;
	}), J("click", g, function(...e) {
		t.onBack?.apply(this, e);
	}), J("click", _, l), J("change", v, c), X(e, m), Re();
}
cr(["click", "change"]);
//#endregion
//#region quicksettings/src/Panel.svelte
var Yi = /* @__PURE__ */ Y("<span class=\"px-1 text-[10.5px] tabular-nums text-base-content/60\"> </span>"), Xi = /* @__PURE__ */ Y("<div class=\"flex flex-col gap-0.5 rounded-2xl bg-base-300/70 p-1\"><button type=\"button\" class=\"rounded-xl px-3 py-1.5 text-left text-[12px] hover:bg-base-content/10\">Lock</button> <button type=\"button\" class=\"rounded-xl px-3 py-1.5 text-left text-[12px] hover:bg-base-content/10\">Log out</button> <button type=\"button\" class=\"rounded-xl px-3 py-1.5 text-left text-[12px] hover:bg-base-content/10\">Sleep</button> <button type=\"button\" class=\"rounded-xl px-3 py-1.5 text-left text-[12px] hover:bg-base-content/10\">Restart</button> <button type=\"button\" class=\"rounded-xl px-3 py-1.5 text-left text-[12px] text-error\n                hover:bg-error/15\">Power off</button></div>"), Zi = /* @__PURE__ */ Y("<div class=\"grid grid-cols-4 gap-2\"><div class=\"col-span-2\"><!></div> <!> <!> <div class=\"col-span-2\"><!></div> <div class=\"col-span-2\"><!></div> <div class=\"col-span-2\"><!></div> <div class=\"col-span-2\"><!></div></div> <div class=\"flex flex-col gap-2\"><!> <!></div> <div class=\"flex items-center gap-1 border-t border-base-content/10 px-0.5 pt-1.5\"><button type=\"button\" class=\"flex items-center gap-0.5 rounded-full px-1.5 py-1 text-base-content/70\n              transition-colors hover:bg-base-content/10\" aria-label=\"Power options\"><!> <!></button> <span class=\"flex-1\"></span> <!></div> <!>", 1), Qi = /* @__PURE__ */ Y("<div class=\"fixed inset-0\" data-input-region=\"\"><button type=\"button\" class=\"absolute inset-0 cursor-default\" aria-label=\"Close quick settings\"></button> <div class=\"panel absolute right-2.5 flex w-[20.5rem] flex-col gap-2.5 rounded-3xl\n        border border-base-content/8 bg-base-200 p-2.5 text-base-content\n        shadow-2xl shadow-black/60 svelte-oxg5ba\"><!></div></div>"), $i = /* @__PURE__ */ Y("<div class=\"pointer-events-none fixed top-0 left-0 h-0 w-0\" data-input-region=\"\" aria-hidden=\"true\"></div>");
function ea(e, t) {
	Le(t, !0);
	let n = ri(t, "top", 3, 36), r = /* @__PURE__ */ I(!1), i = /* @__PURE__ */ I("main"), a = /* @__PURE__ */ I(!1), o = /* @__PURE__ */ I(Kt(be())), s = /* @__PURE__ */ I(Kt([])), c = /* @__PURE__ */ I(Kt(xe())), l = /* @__PURE__ */ I(Kt([])), u = /* @__PURE__ */ I(0), d = /* @__PURE__ */ I(!1), f = /* @__PURE__ */ I(0), p = /* @__PURE__ */ I(!1), m = /* @__PURE__ */ I(-1), h = /* @__PURE__ */ I(""), g = /* @__PURE__ */ I(!1), _ = /* @__PURE__ */ I(""), v = /* @__PURE__ */ P(() => q(l).find((e) => e.connected));
	fn(() => {
		let e = [
			t.bus.subscribe("quicksettings:toggle", () => y(!q(r))),
			t.bus.subscribe("quicksettings:open", () => y(!0)),
			t.bus.subscribe("quicksettings:close", () => y(!1)),
			t.bus.subscribe("network.state", (e) => {
				L(o, he(e.data), !0);
			}),
			t.bus.subscribe("network.networks", (e) => {
				L(s, ge(e.data), !0);
			}),
			t.bus.subscribe("bluetooth.state", (e) => {
				L(c, _e(e.data), !0);
			}),
			t.bus.subscribe("bluetooth.devices", (e) => {
				L(l, ve(e.data), !0);
			}),
			t.bus.subscribe("system.volume", (e) => {
				S(e.data);
			}),
			t.bus.subscribe("system.brightness", (e) => {
				C(e.data);
			}),
			t.bus.subscribe("system.battery", (e) => {
				w(e.data);
			}),
			t.bus.subscribe("config", (e) => {
				T(e.data);
			}),
			t.bus.subscribe("hypr.event", (e) => {
				E(e.data);
			})
		];
		return () => {
			for (let t of e) t();
		};
	});
	function y(e) {
		L(r, e, !0), !e && (L(i, "main"), L(a, !1));
	}
	function b() {
		y(!1);
	}
	function x(e) {
		if (!(e.key !== "Escape" || !q(r))) {
			if (q(i) !== "main") {
				L(i, "main");
				return;
			}
			b();
		}
	}
	function S(e) {
		let t = vi(e);
		L(u, xi(t.volume, q(u)), !0), L(d, t.muted === !0);
	}
	function C(e) {
		let t = vi(e);
		L(f, xi(t.percent, q(f)), !0), L(p, t.available === !0);
	}
	function w(e) {
		let t = vi(e);
		L(m, xi(t.percent, -1), !0), L(h, bi(t.status), !0);
	}
	function T(e) {
		let t = vi(vi(e).notifications);
		L(g, t.doNotDisturb === !0);
	}
	function E(e) {
		let t = vi(e);
		if (t.event !== "activelayout" || typeof t.data != "string") return;
		let n = t.data.lastIndexOf(",");
		n < 0 || L(_, t.data.slice(n + 1), !0);
	}
	function ee(e) {
		L(u, e, !0), t.bus.call("system:setVolume", { volume: e }, 5e3);
	}
	function te() {
		L(d, !q(d)), t.bus.call("system:setMuted", { muted: q(d) }, 5e3);
	}
	function ne(e) {
		L(f, e, !0), t.bus.call("system:setBrightness", { percent: e }, 5e3);
	}
	function re() {
		L(g, !q(g)), t.bus.publish("config:set", {
			key: "notifications.doNotDisturb",
			value: q(g)
		});
	}
	function ie() {
		b(), t.bus.call("hypr:dispatch", {
			dispatcher: "exec",
			arg: "grim -g \"$(slurp)\""
		}, 5e3);
	}
	function ae(e) {
		b(), t.bus.call("system:power", { action: e }, 5e3);
	}
	function oe() {
		t.bus.call("network:enable", { enabled: !q(o).enabled }, 15e3);
	}
	function se() {
		t.bus.call("bluetooth:power", { powered: !q(c).powered }, 15e3);
	}
	function ce() {
		return q(o).connected ? q(o).ssid : "Wi-Fi";
	}
	function le() {
		return q(o).available ? q(o).enabled ? q(o).connected ? ci(q(o).signal) : "Not connected" : "Off" : "No adapter";
	}
	function ue() {
		return q(c).available ? q(c).powered ? q(v) === void 0 ? "On" : q(v).name : "Off" : "No adapter";
	}
	function de() {
		return q(v) === void 0 ? "bluetooth" : oi(q(v).icon);
	}
	function fe() {
		return q(_) === "" ? "Default" : q(_);
	}
	function pe() {
		return q(d) ? "volumeMuted" : "volume";
	}
	function me() {
		return q(m) < 0 ? "" : q(h) === "" ? `${q(m)}%` : `${q(m)}% · ${q(h)}`;
	}
	function he(e) {
		let t = vi(e);
		return {
			available: t.available === !0,
			enabled: t.enabled === !0,
			connected: t.connected === !0,
			ssid: bi(t.ssid),
			signal: xi(t.signal, 0),
			secured: t.secured === !0,
			device: bi(t.device),
			ipv4: bi(t.ipv4),
			gateway: bi(t.gateway),
			dns: ye(t.dns)
		};
	}
	function ge(e) {
		return yi(e).map((e) => ({
			ssid: bi(e.ssid),
			signal: xi(e.signal, 0),
			secured: e.secured === !0,
			active: e.active === !0,
			saved: e.saved === !0
		}));
	}
	function _e(e) {
		let t = vi(e);
		return {
			available: t.available === !0,
			powered: t.powered === !0,
			discovering: t.discovering === !0,
			adapter: bi(t.adapter)
		};
	}
	function ve(e) {
		return yi(e).map((e) => ({
			mac: bi(e.mac),
			name: bi(e.name),
			connected: e.connected === !0,
			paired: e.paired === !0,
			trusted: e.trusted === !0,
			icon: bi(e.icon),
			battery: xi(e.battery, -1)
		}));
	}
	function ye(e) {
		return Array.isArray(e) ? e.filter((e) => typeof e == "string") : [];
	}
	function be() {
		return {
			available: !1,
			enabled: !1,
			connected: !1,
			ssid: "",
			signal: 0,
			secured: !1,
			device: "",
			ipv4: "",
			gateway: "",
			dns: []
		};
	}
	function xe() {
		return {
			available: !1,
			powered: !1,
			discovering: !1,
			adapter: ""
		};
	}
	var Se = _r();
	sr("keydown", qt, x);
	var Ce = tn(Se), D = (e) => {
		var r = Qi(), d = R(r), h = z(d, 2);
		let _;
		var v = R(h), y = (e) => {
			Ii(e, {
				get bus() {
					return t.bus;
				},
				get networkState() {
					return q(o);
				},
				get networks() {
					return q(s);
				},
				onBack: () => L(i, "main")
			});
		}, x = (e) => {
			Ji(e, {
				get bus() {
					return t.bus;
				},
				get bluetoothState() {
					return q(c);
				},
				get devices() {
					return q(l);
				},
				onBack: () => L(i, "main")
			});
		}, S = (e) => {
			var t = Zi(), n = tn(t), r = R(n), s = R(r);
			{
				let e = /* @__PURE__ */ P(() => si(q(o).signal, q(o).connected)), t = /* @__PURE__ */ P(ce), n = /* @__PURE__ */ P(le), r = /* @__PURE__ */ P(() => !q(o).available);
				hi(s, {
					get icon() {
						return q(e);
					},
					get title() {
						return q(t);
					},
					get subtitle() {
						return q(n);
					},
					get active() {
						return q(o).enabled;
					},
					get disabled() {
						return q(r);
					},
					onActivate: oe,
					onOpen: () => L(i, "wifi")
				});
			}
			j(r);
			var l = z(r, 2);
			hi(l, {
				compact: !0,
				icon: "camera",
				title: "Screen capture",
				onActivate: ie
			});
			var d = z(l, 2);
			hi(d, {
				compact: !0,
				icon: "moon",
				title: "Do not disturb",
				get active() {
					return q(g);
				},
				onActivate: re
			});
			var h = z(d, 2), _ = R(h);
			{
				let e = /* @__PURE__ */ P(de), t = /* @__PURE__ */ P(ue), n = /* @__PURE__ */ P(() => !q(c).available);
				hi(_, {
					get icon() {
						return q(e);
					},
					title: "Bluetooth",
					get subtitle() {
						return q(t);
					},
					get active() {
						return q(c).powered;
					},
					get disabled() {
						return q(n);
					},
					onActivate: se,
					onOpen: () => L(i, "bluetooth")
				});
			}
			j(h);
			var v = z(h, 2);
			hi(R(v), {
				icon: "cast",
				title: "Cast screen",
				subtitle: "Unavailable",
				disabled: !0
			}), j(v);
			var y = z(v, 2);
			hi(R(y), {
				icon: "share",
				title: "Nearby share",
				subtitle: "Unavailable",
				disabled: !0
			}), j(y);
			var b = z(y, 2), x = R(b);
			{
				let e = /* @__PURE__ */ P(fe);
				hi(x, {
					icon: "keyboard",
					title: "Keyboard",
					get subtitle() {
						return q(e);
					},
					disabled: !0
				});
			}
			j(b), j(n);
			var S = z(n, 2), C = R(S);
			{
				let e = /* @__PURE__ */ P(pe);
				_i(C, {
					get icon() {
						return q(e);
					},
					label: "Volume",
					get value() {
						return q(u);
					},
					onInput: ee,
					onIconClick: te
				});
			}
			var w = z(C, 2);
			{
				let e = /* @__PURE__ */ P(() => !q(p));
				_i(w, {
					icon: "sun",
					label: "Brightness",
					get value() {
						return q(f);
					},
					get disabled() {
						return q(e);
					},
					onInput: ne
				});
			}
			j(S);
			var T = z(S, 2), E = R(T), he = R(E);
			$(he, {
				name: "power",
				size: 16
			}), $(z(he, 2), {
				name: "chevronDown",
				size: 12
			}), j(E);
			var ge = z(E, 4), _e = (e) => {
				var t = Yi(), n = R(t, !0);
				j(t), B((e) => Z(n, e), [() => me()]), X(e, t);
			};
			Q(ge, (e) => {
				q(m) >= 0 && e(_e);
			}), j(T);
			var ve = z(T, 2), ye = (e) => {
				var t = Xi(), n = R(t), r = z(n, 2), i = z(r, 2), a = z(i, 2), o = z(a, 2);
				j(t), J("click", n, () => ae("lock")), J("click", r, () => ae("logout")), J("click", i, () => ae("suspend")), J("click", a, () => ae("reboot")), J("click", o, () => ae("poweroff")), X(e, t);
			};
			Q(ve, (e) => {
				q(a) && e(ye);
			}), J("click", E, () => L(a, !q(a))), X(e, t);
		};
		Q(v, (e) => {
			q(i) === "wifi" ? e(y) : q(i) === "bluetooth" ? e(x, 1) : e(S, -1);
		}), j(h), j(r), B(() => _ = Br(h, "", _, { top: `${n() ?? ""}px` })), J("click", d, b), X(e, r);
	}, we = (e) => {
		X(e, $i());
	};
	Q(Ce, (e) => {
		q(r) ? e(D) : e(we, -1);
	}), X(e, Se), Re();
}
cr(["click"]);
//#endregion
//#region quicksettings/src/views.ts
var ta = {
	name: "quicksettings-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = Ci(e, "ui"), n = Ci(e, "bus");
		e.effect(() => aa()), e.effect(() => t.register("quicksettings.panel", na(n)));
	}
};
function na(e) {
	return (t, n) => {
		let r = vr(ea, {
			target: t,
			props: {
				bus: e,
				top: ra(n)
			}
		});
		return { dispose() {
			Sr(r);
		} };
	};
}
function ra(e) {
	if (typeof e != "object" || !e) return 36;
	let t = e.top;
	return typeof t == "number" ? t : 36;
}
function ia(e) {
	let t = e.indexOf("?");
	return t < 0 ? "" : e.slice(t);
}
function aa() {
	if (oa()) return () => {};
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = `/plugins/quicksettings/views.css${ia(import.meta.url)}`, document.head.appendChild(e), () => {
		e.remove();
	};
}
function oa() {
	return new URL(import.meta.url).origin !== window.location.origin;
}
//#endregion
export { ta as default };
