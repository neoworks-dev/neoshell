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
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/constants.js
var m = 1 << 24, h = 1024, g = 2048, _ = 4096, v = 8192, y = 16384, ee = 32768, te = 1 << 25, ne = 65536, re = 1 << 19, ie = 1 << 20, ae = 65536, oe = 1 << 21, se = 1 << 22, ce = 1 << 23, le = Symbol("$state"), ue = Symbol(""), de = Symbol("attributes"), fe = Symbol("class"), pe = Symbol("style"), me = Symbol("text"), he = Symbol("form reset"), ge = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), _e = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function ve(e) {
	throw Error("https://svelte.dev/e/lifecycle_outside_component");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/errors.js
function ye() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function be(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function xe() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Se(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function Ce() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function we() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function Te() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function Ee() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function De() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/constants.js
var Oe = {}, b = Symbol("uninitialized"), ke = "http://www.w3.org/1999/xhtml";
function Ae() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function je(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function Me() {
	console.warn("https://svelte.dev/e/select_multiple_invalid_value");
}
function Ne() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/hydration.js
var x = !1;
function Pe(e) {
	x = e;
}
var S;
function C(e) {
	if (e === null) throw je(), Oe;
	return S = e;
}
function Fe() {
	return C(/* @__PURE__ */ I(S));
}
function Ie(e) {
	if (x) {
		if (/* @__PURE__ */ I(S) !== null) throw je(), Oe;
		S = e;
	}
}
function Le(e = 1) {
	if (x) {
		for (var t = e, n = S; t--;) n = /* @__PURE__ */ I(n);
		S = n;
	}
}
function Re(e = !0) {
	for (var t = 0, n = S;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ I(n);
		e && n.remove(), n = i;
	}
}
function ze(e) {
	if (!e || e.nodeType !== 8) throw je(), Oe;
	return e.data;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/equality.js
function Be(e) {
	return e === this.v;
}
function Ve(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function He(e) {
	return !Ve(e, this.v);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/context.js
var w = null;
function Ue(e) {
	w = e;
}
function We(e) {
	return Ye("getContext").get(e);
}
function Ge(e) {
	return Ye("hasContext").has(e);
}
function Ke(e, t = !1, n) {
	w = {
		p: w,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: W,
		l: null
	};
}
function qe(e) {
	var t = w, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) mn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, w = t.p, e ?? {};
}
function Je() {
	return !0;
}
function Ye(e) {
	return w === null && ve(e), w.c ??= new Map(Xe(w) || void 0);
}
function Xe(e) {
	let t = e.p;
	for (; t !== null;) {
		let e = t.c;
		if (e !== null) return e;
		t = t.p;
	}
	return null;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/task.js
var Ze = [];
function Qe() {
	var e = Ze;
	Ze = [], f(e);
}
function T(e) {
	if (Ze.length === 0 && !Ot) {
		var t = Ze;
		queueMicrotask(() => {
			t === Ze && Qe();
		});
	}
	Ze.push(e);
}
function $e(e) {
	var t = W;
	if (t === null) return V.f |= ce, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	E(e, t);
}
function E(e, t) {
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
var et = ~(g | _ | h);
function D(e, t) {
	e.f = e.f & et | t;
}
function tt(e) {
	e.f & 512 || e.deps === null ? D(e, h) : D(e, _);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/utils.js
function nt(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= ae, nt(t.deps));
}
function rt(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), nt(e.deps), D(e, h);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/misc.js
function it(e, t) {
	if (t) {
		let t = document.body;
		e.autofocus = !0, T(() => {
			document.activeElement === t && e.focus();
		});
	}
}
var at = !1;
function ot() {
	at || (at = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[he]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function st(e) {
	var t = V, n = W;
	U(null), G(null);
	try {
		return e();
	} finally {
		U(t), G(n);
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/reactivity/create-subscriber.js
function ct(e) {
	let t = 0, n = Ut(0), r;
	return () => {
		dn() && (X(n), vn(() => (t === 0 && (r = Xn(() => e(() => Kt(n)))), t += 1, () => {
			T(() => {
				--t, t === 0 && (r?.(), r = void 0, Kt(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var lt = ne | re;
function ut(e, t, n, r) {
	new dt(e, t, n, r);
}
var dt = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = x ? S : null;
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
	#h = ct(() => (this.#m = Ut(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = bn(() => {
			if (x) {
				let e = this.#t;
				Fe();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, lt), x && (this.#e = S);
	}
	#g() {
		try {
			this.#a = R(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		T(r), t && (this.#s = R(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				Ne();
				return;
			}
			t = !0, n && De(), this.#s !== null && Dn(this.#s, () => {
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
					E(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = R(() => e(this.#e)), T(() => {
			var e = this.#c = document.createDocumentFragment(), t = P();
			e.append(t), this.#a = this.#S(() => R(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, Dn(this.#o, () => {
				this.#o = null;
			}), this.#x(k));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = R(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				jn(this.#a, e);
				let t = this.#n.pending;
				this.#o = R(() => t(this.#e));
			} else this.#x(k);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		rt(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = V, r = w;
		G(this.#i), U(this.#i), Ue(this.#i.ctx);
		try {
			return Pt.ensure(), e();
		} catch (e) {
			return $e(e), null;
		} finally {
			G(t), U(n), Ue(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && Dn(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, T(() => {
			this.#d = !1, this.#m && Wt(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), X(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		k?.is_fork ? (this.#a && k.skip_effect(this.#a), this.#o && k.skip_effect(this.#o), this.#s && k.skip_effect(this.#s), k.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (z(this.#a), null), this.#o &&= (z(this.#o), null), this.#s &&= (z(this.#s), null), x && (C(this.#t), Le(), C(Re()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return R(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return E(e, this.#i.parent), null;
				}
			}));
		};
		T(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				E(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => E(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/async.js
function ft(e, t, n, r) {
	let i = Je() ? gt : yt;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = pt(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				E(e, s);
			}
			mt();
		}
	}
	var d = ht();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ vt(e))).then(u).catch((e) => E(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), mt();
	}) : f();
}
function pt() {
	var e = W, t = V, n = w, r = k;
	return function(i = !0) {
		G(e), U(t), Ue(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function mt(e = !0) {
	G(null), U(null), Ue(null), e && k?.deactivate();
}
function ht() {
	var e = W, t = e.b, n = k, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function gt(e) {
	var t = 2 | g;
	return W !== null && (W.f |= re), {
		ctx: w,
		deps: null,
		effects: null,
		equals: Be,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: b,
		wv: 0,
		parent: W,
		ac: null
	};
}
var _t = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function vt(e, t, n) {
	let r = W;
	r === null && ye();
	var i = void 0, a = Ut(b), o = !V, s = /* @__PURE__ */ new Set();
	return _n(() => {
		var t = W, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== ge && n.reject(e);
			}).finally(mt);
		} catch (e) {
			n.reject(e), mt();
		}
		var c = k;
		if (o) {
			if (t.f & 32768) var l = ht();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(_t);
			else for (let e of s.values()) e.reject(_t);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== _t && (c.activate(), t ? (a.f |= ce, Wt(a, t)) : (a.f & 8388608 && (a.f ^= ce), Wt(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), fn(() => {
		for (let e of s) e.reject(_t);
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
function O(e) {
	let t = /* @__PURE__ */ gt(e);
	return Fn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function yt(e) {
	let t = /* @__PURE__ */ gt(e);
	return t.equals = He, t;
}
function bt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) z(t[n]);
	}
}
function xt(e) {
	var t, n = W, r = e.parent;
	if (!B && r !== null && e.v !== b && r.f & 24576) return Ae(), e.v;
	G(r);
	try {
		e.f &= ~ae, bt(e), t = Wn(e);
	} finally {
		G(n);
	}
	return t;
}
function St(e) {
	var t = xt(e);
	if (!e.equals(t) && (e.wv = Vn(), (!k?.is_fork || e.deps === null) && (k === null ? e.v = t : (k.capture(e, t, !0), Et?.capture(e, t, !0)), e.deps === null))) {
		D(e, h);
		return;
	}
	B || (A === null ? tt(e) : (dn() || k?.is_fork) && A.set(e, t));
}
function Ct(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && st(() => {
		t.ac.abort(ge), t.ac = null;
	}), t.fn !== null && (t.teardown = d), Kn(t, 0), Cn(t));
}
function wt(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && qn(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/batch.js
var Tt = null, k = null, Et = null, A = null, Dt = null, Ot = !1, kt = !1, At = null, jt = null, Mt = 0, Nt = 1, Pt = class e {
	id = Nt++;
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
		Tt === null ? Tt = this : (Tt.#n = this, this.#t = Tt), Tt = this;
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
			for (var r of n.d) D(r, g), t(r);
			for (r of n.m) D(r, _), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		this.#e = !0, Mt++ > 1e3 && (this.#x(), Ft());
		for (let e of this.#u) this.#d.delete(e), D(e, g), this.schedule(e);
		for (let e of this.#d) D(e, _), this.schedule(e);
		let t = this.#c;
		this.#c = [], this.apply();
		var n = At = [], r = [], i = jt = [];
		for (let e of t) try {
			this.#_(e, n, r);
		} catch (t) {
			throw zt(e), this.#h() || this.discard(), t;
		}
		if (k = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (At = null, jt = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) Rt(e, t);
			i.length > 0 && k.#g();
			return;
		}
		let o = this.#v();
		if (o) {
			this.#b(r), this.#b(n), o.#y(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), Et = this, It(r), It(n), Et = null, this.#s?.resolve();
		var s = k;
		if (this.#a === 0 && (this.#c.length === 0 || s !== null) && this.#x(), this.#c.length > 0) {
			if (s !== null) {
				let e = s;
				e.#c.push(...this.#c.filter((t) => !e.#c.includes(t)));
			} else s = this;
		}
		s !== null && s.#g();
	}
	#_(e, t, n) {
		e.f ^= h;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= h : i & 4 ? t.push(r) : Hn(r) && (i & 16 && this.#d.add(r), qn(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), D(i, g), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#x(), k = this, this.#g();
	}
	#b(e) {
		for (var t = 0; t < e.length; t += 1) rt(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== b && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), A?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		k = this;
	}
	deactivate() {
		k = null, A = null;
	}
	flush() {
		try {
			kt = !0, k = this, this.#g();
		} finally {
			Mt = 0, Dt = null, At = null, jt = null, kt = !1, k = null, A = null, Vt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(_t);
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
		this.#m || (this.#m = !0, T(() => {
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
		if (k === null) {
			let t = k = new e();
			!kt && T(() => {
				t.#e || t.flush();
			});
		}
		return k;
	}
	apply() {
		A = null;
	}
	schedule(e) {
		if (Dt = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		for (var t = e; t.parent !== null;) {
			t = t.parent;
			var n = t.f;
			if (At !== null && t === W && (V === null || !(V.f & 2))) return;
			if (n & 96) {
				if (!(n & 1024)) return;
				t.f ^= h;
			}
		}
		this.#c.push(t);
	}
	#x() {
		if (this.linked) {
			var e = this.#t, t = this.#n;
			e === null || (e.#n = t), t === null ? Tt = e : t.#t = e, this.linked = !1;
		}
	}
};
function Ft() {
	try {
		Ce();
	} catch (e) {
		E(e, Dt);
	}
}
var j = null;
function It(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && Hn(r) && (j = /* @__PURE__ */ new Set(), qn(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && En(r), j?.size > 0)) {
				Vt.clear();
				for (let e of j) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) j.has(n) && (j.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || qn(n);
					}
				}
				j.clear();
			}
		}
		j = null;
	}
}
function Lt(e) {
	k.schedule(e);
}
function Rt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), D(e, h);
		for (var n = e.first; n !== null;) Rt(n, t), n = n.next;
	}
}
function zt(e) {
	D(e, h);
	for (var t = e.first; t !== null;) zt(t), t = t.next;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/sources.js
var Bt = /* @__PURE__ */ new Set(), Vt = /* @__PURE__ */ new Map(), Ht = !1;
function Ut(e, t) {
	return {
		f: 0,
		v: e,
		reactions: null,
		equals: Be,
		rv: 0,
		wv: 0
	};
}
/*#__NO_SIDE_EFFECTS__*/
function M(e, t) {
	let n = Ut(e, t);
	return Fn(n), n;
}
function N(e, t, n = !1) {
	return V !== null && (!H || V.f & 131072) && Je() && V.f & 4325394 && (K === null || !K.has(e)) && Ee(), Wt(e, n ? Jt(t) : t, jt);
}
function Wt(e, t, n = null) {
	if (!e.equals(t)) {
		Vt.set(e, B ? t : e.v);
		var r = Pt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && xt(t), A === null && tt(t);
		}
		e.wv = Vn(), qt(e, g, n), Je() && W !== null && W.f & 1024 && !(W.f & 96) && (Y === null ? In([e]) : Y.push(e)), !r.is_fork && Bt.size > 0 && !Ht && Gt();
	}
	return t;
}
function Gt() {
	Ht = !1;
	for (let e of Bt) {
		e.f & 1024 && D(e, _);
		let t;
		try {
			t = Hn(e);
		} catch {
			t = !0;
		}
		t && qn(e);
	}
	Bt.clear();
}
function Kt(e) {
	N(e, e.v + 1);
}
function qt(e, t, n) {
	var r = e.reactions;
	if (r !== null) for (var i = Je(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === W)) {
			var l = (c & g) === 0;
			if (l && D(s, t), c & 131072) Bt.add(s);
			else if (c & 2) {
				var u = s;
				A?.delete(u), c & 65536 || (c & 512 && (W === null || !(W.f & 2097152)) && (s.f |= ae), qt(u, _, n));
			} else if (l) {
				var d = s;
				c & 16 && j !== null && j.add(d), n === null ? Lt(d) : n.push(d);
			}
		}
	}
}
function Jt(t) {
	if (typeof t != "object" || !t || le in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ M(0), u = null, d = zn, f = (e) => {
		if (zn === d) return e();
		var t = V, n = zn;
		U(null), Bn(d);
		var r = e();
		return U(t), Bn(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ M(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && we();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ M(n.value, u);
				return r.set(t, e), e;
			}) : N(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ M(b, u));
					r.set(t, e), Kt(o);
				}
			} else N(n, b), Kt(o);
			return !0;
		},
		get(e, n, i) {
			if (n === le) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ M(Jt(s ? e[n] : b), u)), r.set(n, o)), o !== void 0) {
				var c = X(o);
				return c === b ? void 0 : c;
			}
			return Reflect.get(e, n, i);
		},
		getOwnPropertyDescriptor(e, t) {
			var n = Reflect.getOwnPropertyDescriptor(e, t);
			if (n && "value" in n) {
				var i = r.get(t);
				i && (n.value = X(i));
			} else if (n === void 0) {
				var a = r.get(t), o = a?.v;
				if (a !== void 0 && o !== b) return {
					enumerable: !0,
					configurable: !0,
					value: o,
					writable: !0
				};
			}
			return n;
		},
		has(e, t) {
			if (t === le) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== b || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ M(i ? Jt(e[t]) : b, u)), r.set(t, n)), X(n) === b) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ M(b, u)), r.set(d + "", p)) : N(p, b);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ M(void 0, u)), N(c, Jt(n)), r.set(t, c));
			else {
				l = c.v !== b;
				var m = f(() => Jt(n));
				N(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && N(g, _ + 1);
				}
				Kt(o);
			}
			return !0;
		},
		ownKeys(e) {
			X(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== b;
			});
			for (var [n, i] of r) i.v !== b && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			Te();
		}
	});
}
function Yt(e) {
	try {
		if (typeof e == "object" && e && le in e) return e[le];
	} catch {}
	return e;
}
function Xt(e, t) {
	return Object.is(Yt(e), Yt(t));
}
var Zt, Qt, $t, en;
function tn() {
	if (Zt === void 0) {
		Zt = window, Qt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		$t = a(t, "firstChild").get, en = a(t, "nextSibling").get, u(e) && (e[fe] = void 0, e[de] = null, e[pe] = void 0, e.__e = void 0), u(n) && (n[me] = void 0);
	}
}
function P(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function F(e) {
	return $t.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function I(e) {
	return en.call(e);
}
function nn(e, t) {
	if (!x) return /* @__PURE__ */ F(e);
	var n = /* @__PURE__ */ F(S);
	if (n === null) n = S.appendChild(P());
	else if (t && n.nodeType !== 3) {
		var r = P();
		return n?.before(r), C(r), r;
	}
	return t && cn(n), C(n), n;
}
function rn(e, t = !1) {
	if (!x) {
		var n = /* @__PURE__ */ F(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ I(n) : n;
	}
	if (t) {
		if (S?.nodeType !== 3) {
			var r = P();
			return S?.before(r), C(r), r;
		}
		cn(S);
	}
	return S;
}
function an(e, t = 1, n = !1) {
	let r = x ? S : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ I(r);
	if (!x) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = P();
			return r === null ? i?.after(a) : r.before(a), C(a), a;
		}
		cn(r);
	}
	return C(r), r;
}
function on() {
	return !1;
}
function sn(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function cn(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/effects.js
function ln(e) {
	W === null && (V === null && Se(e), xe()), B && be(e);
}
function un(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function L(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= v);
	var r = {
		ctx: w,
		deps: null,
		nodes: null,
		f: e | g | 512,
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
	k?.register_created_effect(r);
	var i = r;
	if (e & 4) At === null ? Pt.ensure().schedule(r) : At.push(r);
	else if (t !== null) {
		try {
			qn(r);
		} catch (e) {
			throw z(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= ne));
	}
	if (i !== null && (i.parent = n, n !== null && un(i, n), V !== null && V.f & 2 && !(e & 64))) {
		var a = V;
		(a.effects ??= []).push(i);
	}
	return r;
}
function dn() {
	return V !== null && !H;
}
function fn(e) {
	let t = L(8, null);
	return D(t, h), t.teardown = e, t;
}
function pn(e) {
	ln("$effect");
	var t = W.f;
	if (!V && t & 32 && w !== null && !w.i) {
		var n = w;
		(n.e ??= []).push(e);
	} else return mn(e);
}
function mn(e) {
	return L(4 | ie, e);
}
function hn(e) {
	Pt.ensure();
	let t = L(64 | re, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? Dn(t, () => {
			z(t), n(void 0);
		}) : (z(t), n(void 0));
	});
}
function gn(e) {
	return L(4, e);
}
function _n(e) {
	return L(se | re, e);
}
function vn(e, t = 0) {
	return L(8 | t, e);
}
function yn(e, t = [], n = [], r = []) {
	ft(r, t, n, (t) => {
		L(8, () => {
			e(...t.map(X));
		});
	});
}
function bn(e, t = 0) {
	return L(16 | t, e);
}
function xn(e, t = 0) {
	return L(m | t, e);
}
function R(e) {
	return L(32 | re, e);
}
function Sn(e) {
	var t = e.teardown;
	if (t !== null) {
		let e = B, n = V;
		Pn(!0), U(null);
		try {
			t.call(null);
		} finally {
			Pn(e), U(n);
		}
	}
}
function Cn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && st(() => {
			e.abort(ge);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : z(n, t), n = r;
	}
}
function wn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || z(t), t = n;
	}
}
function z(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (Tn(e.nodes.start, e.nodes.end), n = !0), e.f |= te, Cn(e, t && !n), Kn(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	Sn(e), e.f ^= te, e.f |= y;
	var i = e.parent;
	i !== null && i.first !== null && En(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function Tn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ I(e);
		e.remove(), e = n;
	}
}
function En(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function Dn(e, t, n = !0) {
	var r = [];
	On(e, r, !0);
	var i = () => {
		n && z(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function On(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= v;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				On(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function kn(e) {
	An(e, !0);
}
function An(e, t) {
	if (e.f & 8192) {
		e.f ^= v, e.f & 1024 || (D(e, g), Pt.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			An(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function jn(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ I(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/legacy.js
var Mn = null, Nn = !1, B = !1;
function Pn(e) {
	B = e;
}
var V = null, H = !1;
function U(e) {
	V = e;
}
var W = null;
function G(e) {
	W = e;
}
var K = null;
function Fn(e) {
	V !== null && (K ??= /* @__PURE__ */ new Set()).add(e);
}
var q = null, J = 0, Y = null;
function In(e) {
	Y = e;
}
var Ln = 1, Rn = 0, zn = Rn;
function Bn(e) {
	zn = e;
}
function Vn() {
	return ++Ln;
}
function Hn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 2 && (e.f &= ~ae), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (Hn(a) && St(a), a.wv > e.wv) return !0;
		}
		t & 512 && A === null && D(e, h);
	}
	return !1;
}
function Un(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(K !== null && K.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Un(a, t, !1) : t === a && (n ? D(a, g) : a.f & 1024 && D(a, _), Lt(a));
	}
}
function Wn(e) {
	var t = q, n = J, r = Y, i = V, a = K, o = w, s = H, c = zn, l = e.f;
	q = null, J = 0, Y = null, V = l & 96 ? null : e, K = null, Ue(e.ctx), H = !1, zn = ++Rn, e.ac !== null && (st(() => {
		e.ac.abort(ge);
	}), e.ac = null);
	try {
		e.f |= oe;
		var u = e.fn, d = u();
		e.f |= ee;
		var f = e.deps, p = k?.is_fork;
		if (q !== null) {
			var m;
			if (p || Kn(e, J), f !== null && J > 0) for (f.length = J + q.length, m = 0; m < q.length; m++) f[J + m] = q[m];
			else e.deps = f = q;
			if (dn() && e.f & 512) for (m = J; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && J < f.length && (Kn(e, J), f.length = J);
		if (Je() && Y !== null && !H && f !== null && !(e.f & 6146)) for (m = 0; m < Y.length; m++) Un(Y[m], e);
		if (i !== null && i !== e) {
			if (Rn++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = Rn;
			if (t !== null) for (let e of t) e.rv = Rn;
			Y !== null && (r === null ? r = Y : r.push(...Y));
		}
		return e.f & 8388608 && (e.f ^= ce), d;
	} catch (e) {
		return $e(e);
	} finally {
		e.f ^= oe, q = t, J = n, Y = r, V = i, K = a, Ue(o), H = s, zn = c;
	}
}
function Gn(e, r) {
	let i = r.reactions;
	if (i !== null) {
		var a = t.call(i, e);
		if (a !== -1) {
			var o = i.length - 1;
			o === 0 ? i = r.reactions = null : (i[a] = i[o], i.pop());
		}
	}
	if (i === null && r.f & 2 && (q === null || !n.call(q, r))) {
		var s = r;
		s.f & 512 && (s.f ^= 512, s.f &= ~ae), s.v !== b && tt(s), s.ac !== null && st(() => {
			s.ac.abort(ge), s.ac = null, D(s, g);
		}), Ct(s), Kn(s, 0);
	}
}
function Kn(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) Gn(e, n[r]);
}
function qn(e) {
	var t = e.f;
	if (!(t & 16384)) {
		D(e, h);
		var n = W, r = Nn;
		W = e, Nn = !(t & 96);
		try {
			t & 16777232 ? wn(e) : Cn(e), Sn(e);
			var i = Wn(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = Ln;
		} finally {
			Nn = r, W = n;
		}
	}
}
function X(e) {
	var t = !!(e.f & 2);
	if (Mn?.add(e), V !== null && !H && !(W !== null && W.f & 16384) && (K === null || !K.has(e))) {
		var r = V.deps;
		if (V.f & 2097152) e.rv < Rn && (e.rv = Rn, q === null && r !== null && r[J] === e ? J++ : q === null ? q = [e] : q.push(e));
		else {
			V.deps ??= [], n.call(V.deps, e) || V.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [V] : n.call(i, V) || i.push(V);
		}
	}
	if (B && Vt.has(e)) return Vt.get(e);
	if (t) {
		var a = e;
		if (B) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || Yn(a)) && (o = xt(a)), Vt.set(a, o), o;
		}
		var s = !(a.f & 512) && !H && V !== null && (Nn || !!(V.f & 512)), c = (a.f & ee) === 0;
		Hn(a) && (s && (a.f |= 512), St(a)), s && !c && (wt(a), Jn(a));
	}
	if (A?.has(e)) return A.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function Jn(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (wt(t), Jn(t));
}
function Yn(e) {
	if (e.v === b) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (Vt.has(t) || t.f & 2 && Yn(t)) return !0;
	return !1;
}
function Xn(e) {
	var t = H;
	try {
		return H = !0, e();
	} finally {
		H = t;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/utils.js
function Zn(e) {
	return e.endsWith("capture") && e !== "gotpointercapture" && e !== "lostpointercapture";
}
var Qn = [
	"beforeinput",
	"click",
	"change",
	"dblclick",
	"contextmenu",
	"focusin",
	"focusout",
	"input",
	"keydown",
	"keyup",
	"mousedown",
	"mousemove",
	"mouseout",
	"mouseover",
	"mouseup",
	"pointerdown",
	"pointermove",
	"pointerout",
	"pointerover",
	"pointerup",
	"touchend",
	"touchmove",
	"touchstart"
];
function $n(e) {
	return Qn.includes(e);
}
var er = /* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split("."), tr = {
	formnovalidate: "formNoValidate",
	ismap: "isMap",
	nomodule: "noModule",
	playsinline: "playsInline",
	readonly: "readOnly",
	defaultvalue: "defaultValue",
	defaultchecked: "defaultChecked",
	srcobject: "srcObject",
	novalidate: "noValidate",
	allowfullscreen: "allowFullscreen",
	disablepictureinpicture: "disablePictureInPicture",
	disableremoteplayback: "disableRemotePlayback"
};
function nr(e) {
	return e = e.toLowerCase(), tr[e] ?? e;
}
[...er];
var rr = ["touchstart", "touchmove"];
function ir(e) {
	return rr.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/events.js
var ar = Symbol("events"), or = /* @__PURE__ */ new Set(), sr = /* @__PURE__ */ new Set();
function cr(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || fr.call(t, e), !e.cancelBubble) return st(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? T(() => {
		t.addEventListener(e, i, r);
	}) : t.addEventListener(e, i, r), i;
}
function lr(e, t, n) {
	(t[ar] ??= {})[e] = n;
}
function ur(e) {
	for (var t = 0; t < e.length; t++) or.add(e[t]);
	for (var n of sr) n(e);
}
var dr = null;
function fr(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	dr = e;
	var s = 0, c = dr === e && e[ar];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[ar] = t;
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
		var d = V, f = W;
		U(null), G(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[ar]?.[r];
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
			e[ar] = t, delete e.currentTarget, U(d), G(f);
		}
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/reconciler.js
var pr = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function mr(e) {
	return pr?.createHTML(e) ?? e;
}
function hr(e) {
	var t = sn("template");
	return t.innerHTML = mr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/template.js
function Z(e, t) {
	var n = W;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function gr(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (x) return Z(S, null), S;
		i === void 0 && (i = hr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ F(i)));
		var t = r || Qt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ F(t), s = t.lastChild;
			Z(o, s);
		} else Z(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function _r(e, t, n = "svg") {
	var r = !e.startsWith("<!>"), i = !!(t & 1), a = `<${n}>${r ? e : "<!>" + e}</${n}>`, o;
	return () => {
		if (x) return Z(S, null), S;
		if (!o) {
			var e = /* @__PURE__ */ F(hr(a));
			if (i) for (o = document.createDocumentFragment(); /* @__PURE__ */ F(e);) o.appendChild(/* @__PURE__ */ F(e));
			else o = /* @__PURE__ */ F(e);
		}
		var t = o.cloneNode(!0);
		if (i) {
			var n = /* @__PURE__ */ F(t), r = t.lastChild;
			Z(n, r);
		} else Z(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function Q(e, t) {
	return /* @__PURE__ */ _r(e, t, "svg");
}
function vr(e = "") {
	if (!x) {
		var t = P(e + "");
		return Z(t, t), t;
	}
	var n = S;
	return n.nodeType === 3 ? cn(n) : (n.before(n = P()), C(n)), Z(n, n), n;
}
function yr() {
	if (x) return Z(S, null), S;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = P();
	return e.append(t, n), Z(t, n), e;
}
function $(e, t) {
	if (x) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = S), Fe();
		return;
	}
	e !== null && e.before(t);
}
function br(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[me] ??= e.nodeValue) && (e[me] = n, e.nodeValue = `${n}`);
}
function xr(e, t) {
	return Cr(e, t);
}
var Sr = /* @__PURE__ */ new Map();
function Cr(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	tn();
	var l = void 0, u = hn(() => {
		var s = n ?? t.appendChild(P());
		ut(s, { pending: () => {} }, (t) => {
			Ke({});
			var n = w;
			if (o && (n.c = o), a && (i.$$events = a), x && Z(t, null), l = e(t, i) || {}, x && (W.nodes.end = S, S === null || S.nodeType !== 8 || S.data !== "]")) throw je(), Oe;
			qe();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = ir(r);
					for (let e of [t, document]) {
						var a = Sr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), Sr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, fr, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(or)), sr.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = Sr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, fr), r.delete(e), r.size === 0 && Sr.delete(n)) : r.set(e, i);
			}
			sr.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return wr.set(l, u), l;
}
var wr = /* @__PURE__ */ new WeakMap();
function Tr(e, t) {
	let n = wr.get(e);
	return n ? (wr.delete(e), n(t)) : Promise.resolve();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var Er = class {
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
			if (n) kn(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (kn(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
			}
			for (let [t, n] of this.#e) {
				if (this.#e.delete(t), t === e) break;
				let r = this.#n.get(n);
				r && (z(r.effect), this.#n.delete(n));
			}
			for (let [e, r] of this.#t) {
				if (e === t || this.#r.has(e)) continue;
				let i = () => {
					if (Array.from(this.#e.values()).includes(e)) {
						var t = document.createDocumentFragment();
						jn(r, t), t.append(P()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else z(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), Dn(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (z(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = k, r = on();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = P();
				i.append(a), this.#n.set(e, {
					effect: R(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, R(() => t(this.anchor)));
		}
		if (this.#e.set(n, e), r) {
			for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(this.#a), n.ondiscard(this.#o);
		} else x && (this.anchor = S), this.#a(n);
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/if.js
function Dr(e, t, n = !1) {
	var r;
	x && (r = S, Fe());
	var i = new Er(e), a = n ? ne : 0;
	function o(e, t) {
		if (x) {
			var n = ze(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Re();
				C(a), i.anchor = a, Pe(!1), i.ensure(e, t), Pe(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	bn(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/snippet.js
function Or(e, t, ...n) {
	var r = new Er(e);
	bn(() => {
		let e = t() ?? null;
		r.ensure(e, e && ((t) => e(t, ...n)));
	}, ne);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attachments.js
function kr(e, t) {
	var n = void 0, r;
	xn(() => {
		n !== (n = t()) && (r &&= (z(r), null), n && (r = R(() => {
			gn(() => n(e));
		})));
	});
}
//#endregion
//#region ../../node_modules/.bun/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function Ar(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = Ar(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function jr() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = Ar(e)) && (r && (r += " "), r += t);
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/attributes.js
function Mr(e) {
	return typeof e == "object" ? jr(e) : e ?? "";
}
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
	var o = e[fe];
	if (x || o !== n || o === void 0) {
		var s = Pr(n, r, a);
		(!x || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[fe] = n;
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
	var i = e[pe];
	if (x || i !== t) {
		var a = Lr(t, r);
		(!x || a !== e.getAttribute("style")) && (a == null ? e.removeAttribute("style") : e.style.cssText = a), e[pe] = t;
	} else r && (Array.isArray(r) ? (zr(e, n?.[0], r[0]), zr(e, n?.[1], r[1], "important")) : zr(e, n, r));
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function Vr(t, n, r = !1) {
	if (t.multiple) {
		if (n == null) return;
		if (!e(n)) return Me();
		for (var i of t.options) i.selected = n.includes(Ur(i));
		return;
	}
	for (i of t.options) if (Xt(Ur(i), n)) {
		i.selected = !0;
		return;
	}
	(!r || n !== void 0) && (t.selectedIndex = -1);
}
function Hr(e) {
	var t = new MutationObserver(() => {
		"__value" in e && Vr(e, e.__value);
	});
	t.observe(e, {
		childList: !0,
		subtree: !0,
		attributes: !0,
		attributeFilter: ["value"]
	}), fn(() => {
		t.disconnect();
	});
}
function Ur(e) {
	return "__value" in e ? e.__value : e.value;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var Wr = Symbol("class"), Gr = Symbol("style"), Kr = Symbol("is custom element"), qr = Symbol("is html"), Jr = _e ? "link" : "LINK", Yr = _e ? "input" : "INPUT", Xr = _e ? "option" : "OPTION", Zr = _e ? "select" : "SELECT";
function Qr(e) {
	if (x) {
		var t = !1, n = () => {
			if (!t) {
				if (t = !0, e.hasAttribute("value")) {
					var n = e.value;
					ei(e, "value", null), e.value = n;
				}
				if (e.hasAttribute("checked")) {
					var r = e.checked;
					ei(e, "checked", null), e.checked = r;
				}
			}
		};
		e[he] = n, T(n), ot();
	}
}
function $r(e, t) {
	t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function ei(e, t, n, r) {
	var i = ri(e);
	x && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Jr) || i[t] !== (i[t] = n) && (t === "loading" && (e[ue] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && ai(e).includes(t) ? e[t] = n : e.setAttribute(t, n));
}
function ti(e, t, n, r, i = !1, a = !1) {
	if (x && i && e.nodeName === Yr) {
		var o = e;
		(o.type === "checkbox" ? "defaultChecked" : "defaultValue") in n || Qr(o);
	}
	var s = ri(e), c = s[Kr], l = !s[qr];
	let u = x && c;
	u && Pe(!1);
	var d = t || {}, f = e.nodeName === Xr;
	for (var p in t) p in n || (n[p] = null);
	n.class ? n.class = Mr(n.class) : (r || n[Wr]) && (n.class = null), n[Gr] && (n.style ??= null);
	var m = ai(e);
	if (e.nodeName === Yr && "type" in n && ("value" in n || "__value" in n)) {
		var h = n.type;
		(h !== d.type || h === void 0 && e.hasAttribute("type")) && (d.type = h, ei(e, "type", h, a));
	}
	for (let i in n) {
		let o = n[i];
		if (f && i === "value" && o == null) {
			e.value = e.__value = "", d[i] = o;
			continue;
		}
		if (i === "class") {
			Rr(e, e.namespaceURI === "http://www.w3.org/1999/xhtml", o, r, t?.[Wr], n[Wr]), d[i] = o, d[Wr] = n[Wr];
			continue;
		}
		if (i === "style") {
			Br(e, o, t?.[Gr], n[Gr]), d[i] = o, d[Gr] = n[Gr];
			continue;
		}
		var g = d[i];
		if (!(o === g && !(o === void 0 && e.hasAttribute(i)))) {
			d[i] = o;
			var _ = i[0] + i[1];
			if (_ !== "$$") {
				if (_ === "on") {
					let t = {}, n = "$$" + i, r = i.slice(2);
					var v = $n(r);
					if (Zn(r) && (r = r.slice(0, -7), t.capture = !0), !v && g) {
						if (o != null) continue;
						e.removeEventListener(r, d[n], t), d[n] = null;
					}
					if (v) lr(r, e, o), ur([r]);
					else if (o != null) {
						function a(e) {
							d[i].call(this, e);
						}
						d[n] = cr(r, e, a, t);
					}
				} else if (i === "style") ei(e, i, o);
				else if (i === "autofocus") it(e, !!o);
				else if (!c && (i === "__value" || i === "value" && o != null)) e.value = e.__value = o;
				else if (i === "selected" && f) $r(e, o);
				else {
					var y = i;
					l || (y = nr(y));
					var ee = y === "defaultValue" || y === "defaultChecked";
					if (o == null && !c && !ee) {
						if (s[i] = null, y === "value" || y === "checked") {
							let n = e, r = t === void 0;
							if (y === "value") {
								let e = n.defaultValue;
								n.removeAttribute(y), n.defaultValue = e, n.value = n.__value = r ? e : null;
							} else {
								let e = n.defaultChecked;
								n.removeAttribute(y), n.defaultChecked = e, n.checked = r ? e : !1;
							}
						} else e.removeAttribute(i);
					} else ee || m.includes(y) && (c || typeof o != "string") ? (e[y] = o, y in s && (s[y] = b)) : typeof o != "function" && ei(e, y, o, a);
				}
			}
		}
	}
	return u && Pe(!0), d;
}
function ni(e, t, n = [], r = [], i = [], a, o = !1, s = !1) {
	ft(i, n, r, (n) => {
		var r = void 0, i = {}, c = e.nodeName === Zr, l = !1;
		if (xn(() => {
			var u = t(...n.map(X)), d = ti(e, r, u, a, o, s);
			l && c && "value" in u && Vr(e, u.value);
			for (let e of Object.getOwnPropertySymbols(i)) u[e] || z(i[e]);
			for (let t of Object.getOwnPropertySymbols(u)) {
				var f = u[t];
				t.description === "@attach" && (!r || f !== r[t]) && (i[t] && z(i[t]), i[t] = R(() => kr(e, () => f))), d[t] = f;
			}
			r = d;
		}), c) {
			var u = e;
			gn(() => {
				Vr(u, r.value, !0), Hr(u);
			});
		}
		l = !0;
	});
}
function ri(e) {
	return e[de] ??= {
		[Kr]: e.nodeName.includes("-"),
		[qr]: e.namespaceURI === ke
	};
}
var ii = /* @__PURE__ */ new Map();
function ai(e) {
	var t = e.getAttribute("is") || e.nodeName, n = ii.get(t);
	if (n) return n;
	ii.set(t, n = []);
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.push(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/props.js
var oi = {
	get(e, t) {
		if (!e.exclude.has(t)) return e.props[t];
	},
	set(e, t) {
		return !1;
	},
	getOwnPropertyDescriptor(e, t) {
		if (!e.exclude.has(t) && t in e.props) return {
			enumerable: !0,
			configurable: !0,
			value: e.props[t]
		};
	},
	has(e, t) {
		return !e.exclude.has(t) && t in e.props;
	},
	ownKeys(e) {
		return Reflect.ownKeys(e.props).filter((t) => !e.exclude.has(t));
	}
};
/*#__NO_SIDE_EFFECTS__*/
function si(e, t, n) {
	return new Proxy({
		props: e,
		exclude: t
	}, oi);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/context.js
var ci = Symbol("phosphor-svelte");
function li() {
	return Ge(ci) ? We(ci) : {};
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/ShieldCheckIcon.svelte
var ui = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), di = /* @__PURE__ */ Q("<path d=\"M208,36H48A20,20,0,0,0,28,56v56c0,54.29,26.32,87.22,48.4,105.29,23.71,19.39,47.44,26,48.44,26.29a12.1,12.1,0,0,0,6.32,0c1-.28,24.73-6.9,48.44-26.29,22.08-18.07,48.4-51,48.4-105.29V56A20,20,0,0,0,208,36Zm-4,76c0,35.71-13.09,64.69-38.91,86.15A126.28,126.28,0,0,1,128,219.38a126.14,126.14,0,0,1-37.09-21.23C65.09,176.69,52,147.71,52,112V60H204ZM79.51,144.49a12,12,0,1,1,17-17L112,143l47.51-47.52a12,12,0,0,1,17,17l-56,56a12,12,0,0,1-17,0Z\"></path>"), fi = /* @__PURE__ */ Q("<path d=\"M216,56v56c0,96-88,120-88,120S40,208,40,112V56a8,8,0,0,1,8-8H208A8,8,0,0,1,216,56Z\" opacity=\"0.2\"></path><path d=\"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z\"></path>", 1), pi = /* @__PURE__ */ Q("<path d=\"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm-34.32,69.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z\"></path>"), mi = /* @__PURE__ */ Q("<path d=\"M208,42H48A14,14,0,0,0,34,56v56c0,51.94,25.12,83.4,46.2,100.64,22.73,18.6,45.27,24.89,46.22,25.15a6,6,0,0,0,3.16,0c.95-.26,23.49-6.55,46.22-25.15C196.88,195.4,222,163.94,222,112V56A14,14,0,0,0,208,42Zm2,70c0,37.76-13.94,68.39-41.44,91.06A131.17,131.17,0,0,1,128,225.72a130.94,130.94,0,0,1-40.56-22.66C59.94,180.39,46,149.76,46,112V56a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM172.24,99.76a6,6,0,0,1,0,8.48l-56,56a6,6,0,0,1-8.48,0l-24-24a6,6,0,0,1,8.48-8.48L112,151.51l51.76-51.75A6,6,0,0,1,172.24,99.76Z\"></path>"), hi = /* @__PURE__ */ Q("<path d=\"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z\"></path>"), gi = /* @__PURE__ */ Q("<path d=\"M208,44H48A12,12,0,0,0,36,56v56c0,51.16,24.73,82.12,45.47,99.1,22.4,18.32,44.55,24.5,45.48,24.76a4,4,0,0,0,2.1,0c.93-.26,23.08-6.44,45.48-24.76,20.74-17,45.47-47.94,45.47-99.1V56A12,12,0,0,0,208,44Zm4,68c0,38.44-14.23,69.63-42.29,92.71A132.45,132.45,0,0,1,128,227.82a132.23,132.23,0,0,1-41.71-23.11C58.23,181.63,44,150.44,44,112V56a4,4,0,0,1,4-4H208a4,4,0,0,1,4,4Zm-41.17-10.83a4,4,0,0,1,0,5.66l-56,56a4,4,0,0,1-5.66,0l-24-24a4,4,0,0,1,5.66-5.66L112,154.34l53.17-53.17A4,4,0,0,1,170.83,101.17Z\"></path>"), _i = /* @__PURE__ */ Q("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function vi(e, t) {
	Ke(t, !0);
	let n = li(), r = /* @__PURE__ */ si(t, ui), i = /* @__PURE__ */ O(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ O(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ O(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ O(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = _i();
	ni(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: X(o),
		height: X(o),
		fill: X(a),
		transform: X(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = nn(l), d = (e) => {
		var n = yr();
		Or(rn(n), () => t.children), $(e, n);
	};
	Dr(u, (e) => {
		t.children && e(d);
	});
	var f = an(u, 2), p = (e) => {
		$(e, di());
	}, m = (e) => {
		var t = fi();
		Le(), $(e, t);
	}, h = (e) => {
		$(e, pi());
	}, g = (e) => {
		$(e, mi());
	}, _ = (e) => {
		$(e, hi());
	}, v = (e) => {
		$(e, gi());
	}, y = (e) => {
		var t = vr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), $(e, t);
	};
	Dr(f, (e) => {
		X(i) === "bold" ? e(p) : X(i) === "duotone" ? e(m, 1) : X(i) === "fill" ? e(h, 2) : X(i) === "light" ? e(g, 3) : X(i) === "regular" ? e(_, 4) : X(i) === "thin" ? e(v, 5) : e(y, -1);
	}), Ie(l), $(e, l), qe();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/ShieldSlashIcon.svelte
var yi = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), bi = /* @__PURE__ */ Q("<path d=\"M56.88,31.93A12,12,0,0,0,36,40a20,20,0,0,0-8,16v56c0,54.29,26.32,87.22,48.4,105.29,23.71,19.39,47.44,26,48.44,26.29a12.1,12.1,0,0,0,6.32,0c1.35-.37,30-8.42,55.86-32.82l12.1,13.31a12,12,0,0,0,17.76-16.14ZM128,219.38a126.38,126.38,0,0,1-37.09-21.23C65.09,176.69,52,147.71,52,112V62.24L170.87,193A126,126,0,0,1,128,219.38ZM228,56v56a144,144,0,0,1-8.23,49.16,12,12,0,0,1-11.28,7.92,11.86,11.86,0,0,1-4.08-.72,12,12,0,0,1-7.2-15.37A120.31,120.31,0,0,0,204,112V60H109.33a12,12,0,1,1,0-24H208A20,20,0,0,1,228,56Z\"></path>"), xi = /* @__PURE__ */ Q("<path d=\"M216,56v56c0,96-88,120-88,120S40,208,40,112V56a8,8,0,0,1,8-8H208A8,8,0,0,1,216,56Z\" opacity=\"0.2\"></path><path d=\"M53.92,34.62A8,8,0,0,0,40.26,42,16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1.36-.37,31.27-8.78,57.09-34.72l14.89,16.38a8,8,0,1,0,11.84-10.76Zm74.07,189a128.48,128.48,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56h3.71L176.41,193.15A129.26,129.26,0,0,1,128,223.62ZM224,56v56c0,20.58-3.89,39.61-11.56,56.59A8,8,0,1,1,197.86,162c6.73-14.89,10.14-31.71,10.14-50V56L98.52,56a8,8,0,1,1,0-16H208A16,16,0,0,1,224,56Z\"></path>", 1), Si = /* @__PURE__ */ Q("<path d=\"M224,56v56c0,25.24-5.85,45.72-14.3,62.14a4,4,0,0,1-6.53.87L86.52,46.69a4,4,0,0,1,3-6.69H208A16,16,0,0,1,224,56ZM53.92,34.62A8,8,0,0,0,40.26,42,16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53A131.92,131.92,0,0,0,187.18,205l14.9,16.38a8,8,0,1,0,11.84-10.76Z\"></path>"), Ci = /* @__PURE__ */ Q("<path d=\"M52.44,36a6,6,0,0,0-9.63,7A14,14,0,0,0,34,56v56c0,51.94,25.12,83.4,46.2,100.64,22.73,18.6,45.27,24.89,46.22,25.15a6,6,0,0,0,3.16,0c1.36-.37,31.91-8.95,57.67-35.7L203.56,220a6,6,0,0,0,8.88-8.08ZM128,225.72a130.83,130.83,0,0,1-40.56-22.66C59.94,180.39,46,149.75,46,112V56a2,2,0,0,1,2-2h4.6L179.16,193.19A130.68,130.68,0,0,1,128,225.72ZM222,56v56c0,20.29-3.83,39.05-11.38,55.77a6,6,0,0,1-5.47,3.53,5.86,5.86,0,0,1-2.47-.54,6,6,0,0,1-3-7.93C206.53,147.67,210,130.57,210,112V56a2,2,0,0,0-2-2H98.52a6,6,0,1,1,0-12H208A14,14,0,0,1,222,56Z\"></path>"), wi = /* @__PURE__ */ Q("<path d=\"M53.92,34.62A8,8,0,0,0,40.26,42,16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1.36-.37,31.27-8.78,57.09-34.72l14.89,16.38a8,8,0,1,0,11.84-10.76Zm74.07,189a128.48,128.48,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56h3.71L176.41,193.15A129.26,129.26,0,0,1,128,223.62ZM224,56v56c0,20.58-3.89,39.61-11.56,56.59A8,8,0,1,1,197.86,162c6.73-14.89,10.14-31.71,10.14-50V56L98.52,56a8,8,0,1,1,0-16H208A16,16,0,0,1,224,56Z\"></path>"), Ti = /* @__PURE__ */ Q("<path d=\"M51,37.31A4,4,0,0,0,45,42.69l1.31,1.44A12,12,0,0,0,36,56v56c0,51.16,24.73,82.12,45.47,99.1,22.4,18.32,44.55,24.5,45.48,24.76a4,4,0,0,0,2.1,0c1.37-.37,32.56-9.14,58.23-36.71L205,218.69a4,4,0,1,0,5.92-5.38Zm77,190.51a132.23,132.23,0,0,1-41.71-23.11C58.23,181.63,44,150.44,44,112V56a4,4,0,0,1,4-4H53.5L181.88,193.21C160.23,216.7,133.58,226.06,128,227.82ZM220,56v56c0,20-3.77,38.49-11.2,54.94a4,4,0,0,1-3.65,2.36,4.06,4.06,0,0,1-1.65-.36,4,4,0,0,1-2-5.29c7-15.41,10.49-32.79,10.49-51.65V56a4,4,0,0,0-4-4H98.52a4,4,0,1,1,0-8H208A12,12,0,0,1,220,56Z\"></path>"), Ei = /* @__PURE__ */ Q("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function Di(e, t) {
	Ke(t, !0);
	let n = li(), r = /* @__PURE__ */ si(t, yi), i = /* @__PURE__ */ O(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ O(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ O(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ O(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Ei();
	ni(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: X(o),
		height: X(o),
		fill: X(a),
		transform: X(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = nn(l), d = (e) => {
		var n = yr();
		Or(rn(n), () => t.children), $(e, n);
	};
	Dr(u, (e) => {
		t.children && e(d);
	});
	var f = an(u, 2), p = (e) => {
		$(e, bi());
	}, m = (e) => {
		var t = xi();
		Le(), $(e, t);
	}, h = (e) => {
		$(e, Si());
	}, g = (e) => {
		$(e, Ci());
	}, _ = (e) => {
		$(e, wi());
	}, v = (e) => {
		$(e, Ti());
	}, y = (e) => {
		var t = vr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), $(e, t);
	};
	Dr(f, (e) => {
		X(i) === "bold" ? e(p) : X(i) === "duotone" ? e(m, 1) : X(i) === "fill" ? e(h, 2) : X(i) === "light" ? e(g, 3) : X(i) === "regular" ? e(_, 4) : X(i) === "thin" ? e(v, 5) : e(y, -1);
	}), Ie(l), $(e, l), qe();
}
//#endregion
//#region vpn/src/lib.ts
function Oi() {
	return {
		available: !1,
		connected: !1,
		name: "",
		type: "",
		device: "",
		ipv4: ""
	};
}
function ki(e) {
	let t = Ai(e);
	return {
		available: t.available === !0,
		connected: t.connected === !0,
		name: ji(t.name),
		type: ji(t.type),
		device: ji(t.device),
		ipv4: ji(t.ipv4)
	};
}
function Ai(e) {
	return typeof e != "object" || !e ? {} : e;
}
function ji(e) {
	return typeof e == "string" ? e : "";
}
function Mi(e, t) {
	let n = e.get(t);
	if (n === void 0) throw Error(`views: service "${t}" is not available`);
	return n;
}
//#endregion
//#region vpn/src/Vpn.svelte
var Ni = /* @__PURE__ */ gr("<!> <span class=\"max-w-32 truncate\"> </span>", 1), Pi = /* @__PURE__ */ gr("<button><!></button>");
function Fi(e, t) {
	Ke(t, !0);
	let n = /* @__PURE__ */ M(Jt(Oi())), r = /* @__PURE__ */ M(!1);
	pn(() => t.bus.subscribe("vpn.state", (e) => {
		N(n, ki(e.data), !0), N(r, !1);
	}));
	async function i() {
		N(r, !0);
		try {
			await t.bus.call("vpn:toggle", {});
		} finally {
			N(r, !1);
		}
	}
	let a = "flex h-6 cursor-pointer items-center gap-1.5 rounded-lg px-1.5\n    transition-colors duration-150 hover:bg-base-content/10", o = /* @__PURE__ */ O(() => c(X(n).connected, X(r))), s = /* @__PURE__ */ O(() => u(X(n)));
	function c(e, t) {
		let n = l(e);
		return t ? `${a} ${n} opacity-50` : `${a} ${n}`;
	}
	function l(e) {
		return e ? "text-base-content" : "text-base-content/40";
	}
	function u(e) {
		return e.connected ? e.ipv4 === "" ? e.name : `${e.name} — ${e.ipv4}` : "VPN off";
	}
	var d = yr(), f = rn(d), p = (e) => {
		var t = Pi(), a = nn(t), c = (e) => {
			var t = Ni(), r = rn(t);
			vi(r, {
				size: 16,
				weight: "fill"
			});
			var i = an(r, 2), a = nn(i, !0);
			Ie(i), yn(() => br(a, X(n).name)), $(e, t);
		}, l = (e) => {
			Di(e, { size: 16 });
		};
		Dr(a, (e) => {
			X(n).connected ? e(c) : e(l, -1);
		}), Ie(t), yn(() => {
			Rr(t, 1, Mr(X(o))), t.disabled = X(r), ei(t, "title", X(s)), ei(t, "aria-label", X(s));
		}), lr("click", t, i), $(e, t);
	};
	Dr(f, (e) => {
		X(n).available && e(p);
	}), $(e, d), qe();
}
ur(["click"]);
//#endregion
//#region vpn/src/views.ts
var Ii = {
	name: "vpn-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = Mi(e, "ui"), n = Mi(e, "bus");
		e.effect(() => zi()), e.effect(() => t.register("vpn.indicator", Li(Fi, { bus: n })));
	}
};
function Li(e, t) {
	return (n) => {
		let r = xr(e, {
			target: n,
			props: t
		});
		return { dispose() {
			Tr(r);
		} };
	};
}
function Ri(e) {
	let t = e.indexOf("?");
	return t < 0 ? "" : e.slice(t);
}
function zi() {
	if (Bi()) return () => {};
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = `/plugins/vpn/views.css${Ri(import.meta.url)}`, document.head.appendChild(e), () => {
		e.remove();
	};
}
function Bi() {
	return new URL(import.meta.url).origin !== window.location.origin;
}
//#endregion
export { Ii as default };
