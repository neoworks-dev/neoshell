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
var m = 1024, h = 2048, g = 4096, _ = 8192, v = 16384, y = 32768, b = 1 << 25, x = 65536, S = 1 << 19, ee = 1 << 20, te = 1 << 25, C = 65536, ne = 1 << 21, re = 1 << 22, ie = 1 << 23, ae = Symbol("$state"), oe = Symbol("legacy props"), se = Symbol(""), ce = Symbol("attributes"), le = Symbol("class"), ue = Symbol("style"), de = Symbol("text"), fe = Symbol("form reset"), pe = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), me = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/errors.js
function he() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function ge(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function _e(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function ve() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function ye(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function be() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function xe(e) {
	throw Error("https://svelte.dev/e/props_invalid_value");
}
function Se() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function Ce() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function we() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Te() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/constants.js
var Ee = {}, w = Symbol("uninitialized"), De = "http://www.w3.org/1999/xhtml";
function Oe() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function ke(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function Ae() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/hydration.js
var T = !1;
function je(e) {
	T = e;
}
var E;
function D(e) {
	if (e === null) throw ke(), Ee;
	return E = e;
}
function Me() {
	return D(/* @__PURE__ */ tn(E));
}
function O(e) {
	if (T) {
		if (/* @__PURE__ */ tn(E) !== null) throw ke(), Ee;
		E = e;
	}
}
function Ne(e = 1) {
	if (T) {
		for (var t = e, n = E; t--;) n = /* @__PURE__ */ tn(n);
		E = n;
	}
}
function Pe(e = !0) {
	for (var t = 0, n = E;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ tn(n);
		e && n.remove(), n = i;
	}
}
function Fe(e) {
	if (!e || e.nodeType !== 8) throw ke(), Ee;
	return e.data;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/equality.js
function Ie(e) {
	return e === this.v;
}
function Le(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function Re(e) {
	return !Le(e, this.v);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/context.js
var k = null;
function ze(e) {
	k = e;
}
function Be(e, t = !1, n) {
	k = {
		p: k,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: G,
		l: null
	};
}
function Ve(e) {
	var t = k, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) mn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, k = t.p, e ?? {};
}
function He() {
	return !0;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/task.js
var Ue = [];
function We() {
	var e = Ue;
	Ue = [], f(e);
}
function A(e) {
	if (Ue.length === 0 && !Et) {
		var t = Ue;
		queueMicrotask(() => {
			t === Ue && We();
		});
	}
	Ue.push(e);
}
function Ge() {
	for (; Ue.length > 0;) We();
}
function Ke(e) {
	var t = G;
	if (t === null) return H.f |= ie, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	qe(e, t);
}
function qe(e, t) {
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
var Je = ~(h | g | m);
function j(e, t) {
	e.f = e.f & Je | t;
}
function Ye(e) {
	e.f & 512 || e.deps === null ? j(e, m) : j(e, g);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/utils.js
function Xe(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= C, Xe(t.deps));
}
function Ze(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), Xe(e.deps), j(e, m);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/store.js
var Qe = !1;
function $e(e) {
	var t = Qe;
	try {
		return Qe = !1, [e(), Qe];
	} finally {
		Qe = t;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/misc.js
function et(e, t) {
	if (t) {
		let t = document.body;
		e.autofocus = !0, A(() => {
			document.activeElement === t && e.focus();
		});
	}
}
var tt = !1;
function nt() {
	tt || (tt = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[fe]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function rt(e) {
	var t = H, n = G;
	W(null), Fn(null);
	try {
		return e();
	} finally {
		W(t), Fn(n);
	}
}
function it(e, t, n, r = n) {
	e.addEventListener(t, () => rt(n));
	let i = e[fe];
	e[fe] = i ? () => {
		i(), r(!0);
	} : () => r(!0), nt();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/reactivity/create-subscriber.js
function at(e) {
	let t = 0, n = Ut(0), r;
	return () => {
		dn() && (Y(n), vn(() => (t === 0 && (r = $n(() => e(() => qt(n)))), t += 1, () => {
			A(() => {
				--t, t === 0 && (r?.(), r = void 0, qt(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var ot = x | S;
function st(e, t, n, r) {
	new ct(e, t, n, r);
}
var ct = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = T ? E : null;
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
	#h = at(() => (this.#m = Ut(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = G;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = G.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = bn(() => {
			if (T) {
				let e = this.#t;
				Me();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, ot), T && (this.#e = E);
	}
	#g() {
		try {
			this.#a = B(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		A(r), t && (this.#s = B(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				Ae();
				return;
			}
			t = !0, n && Te(), this.#s !== null && En(this.#s, () => {
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
					qe(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = B(() => e(this.#e)), A(() => {
			var e = this.#c = document.createDocumentFragment(), t = I();
			e.append(t), this.#a = this.#S(() => B(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, En(this.#o, () => {
				this.#o = null;
			}), this.#x(M));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = B(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				An(this.#a, e);
				let t = this.#n.pending;
				this.#o = B(() => t(this.#e));
			} else this.#x(M);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		Ze(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = G, n = H, r = k;
		Fn(this.#i), W(this.#i), ze(this.#i.ctx);
		try {
			return Mt.ensure(), e();
		} catch (e) {
			return Ke(e), null;
		} finally {
			Fn(t), W(n), ze(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && En(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, A(() => {
			this.#d = !1, this.#m && Gt(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), Y(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		M?.is_fork ? (this.#a && M.skip_effect(this.#a), this.#o && M.skip_effect(this.#o), this.#s && M.skip_effect(this.#s), M.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (V(this.#a), null), this.#o &&= (V(this.#o), null), this.#s &&= (V(this.#s), null), T && (D(this.#t), Ne(), D(Pe()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return B(() => {
						var r = G;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return qe(e, this.#i.parent), null;
				}
			}));
		};
		A(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				qe(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => qe(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/async.js
function lt(e, t, n, r) {
	let i = He() ? pt : _t;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = G, c = ut(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				qe(e, s);
			}
			dt();
		}
	}
	var d = ft();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ ht(e))).then(u).catch((e) => qe(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), dt();
	}) : f();
}
function ut() {
	var e = G, t = H, n = k, r = M;
	return function(i = !0) {
		Fn(e), W(t), ze(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function dt(e = !0) {
	Fn(null), W(null), ze(null), e && M?.deactivate();
}
function ft() {
	var e = G, t = e.b, n = M, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function pt(e) {
	var t = 2 | h;
	return G !== null && (G.f |= S), {
		ctx: k,
		deps: null,
		effects: null,
		equals: Ie,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: w,
		wv: 0,
		parent: G,
		ac: null
	};
}
var mt = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function ht(e, t, n) {
	let r = G;
	r === null && he();
	var i = void 0, a = Ut(w), o = !H, s = /* @__PURE__ */ new Set();
	return _n(() => {
		var t = G, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== pe && n.reject(e);
			}).finally(dt);
		} catch (e) {
			n.reject(e), dt();
		}
		var c = M;
		if (o) {
			if (t.f & 32768) var l = ft();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(mt);
			else for (let e of s.values()) e.reject(mt);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== mt && (c.activate(), t ? (a.f |= ie, Gt(a, t)) : (a.f & 8388608 && (a.f ^= ie), Gt(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), fn(() => {
		for (let e of s) e.reject(mt);
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
function gt(e) {
	let t = /* @__PURE__ */ pt(e);
	return Ln(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function _t(e) {
	let t = /* @__PURE__ */ pt(e);
	return t.equals = Re, t;
}
function vt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) V(t[n]);
	}
}
function yt(e) {
	var t, n = G, r = e.parent;
	if (!Nn && r !== null && e.v !== w && r.f & 24576) return Oe(), e.v;
	Fn(r);
	try {
		e.f &= ~C, vt(e), t = Kn(e);
	} finally {
		Fn(n);
	}
	return t;
}
function bt(e) {
	var t = yt(e);
	if (!e.equals(t) && (e.wv = Un(), (!M?.is_fork || e.deps === null) && (M === null ? e.v = t : (M.capture(e, t, !0), wt?.capture(e, t, !0)), e.deps === null))) {
		j(e, m);
		return;
	}
	Nn || (N === null ? Ye(e) : (dn() || M?.is_fork) && N.set(e, t));
}
function xt(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && rt(() => {
		t.ac.abort(pe), t.ac = null;
	}), t.fn !== null && (t.teardown = d), Jn(t, 0), Sn(t));
}
function St(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && Yn(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/batch.js
var Ct = null, M = null, wt = null, N = null, Tt = null, Et = !1, Dt = !1, Ot = null, kt = null, At = 0, jt = 1, Mt = class e {
	id = jt++;
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
		Ct === null ? Ct = this : (Ct.#n = this, this.#t = Ct), Ct = this;
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
			for (var r of n.d) j(r, h), t(r);
			for (r of n.m) j(r, g), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		this.#e = !0, At++ > 1e3 && (this.#x(), Pt());
		for (let e of this.#u) this.#d.delete(e), j(e, h), this.schedule(e);
		for (let e of this.#d) j(e, g), this.schedule(e);
		let t = this.#c;
		this.#c = [], this.apply();
		var n = Ot = [], r = [], i = kt = [];
		for (let e of t) try {
			this.#_(e, n, r);
		} catch (t) {
			throw zt(e), this.#h() || this.discard(), t;
		}
		if (M = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (Ot = null, kt = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) Rt(e, t);
			i.length > 0 && M.#g();
			return;
		}
		let o = this.#v();
		if (o) {
			this.#b(r), this.#b(n), o.#y(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), wt = this, It(r), It(n), wt = null, this.#s?.resolve();
		var s = M;
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
				a ? r.f ^= m : i & 4 ? t.push(r) : Wn(r) && (i & 16 && this.#d.add(r), Yn(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), j(i, h), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#x(), M = this, this.#g();
	}
	#b(e) {
		for (var t = 0; t < e.length; t += 1) Ze(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== w && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), N?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		M = this;
	}
	deactivate() {
		M = null, N = null;
	}
	flush() {
		try {
			Dt = !0, M = this, this.#g();
		} finally {
			At = 0, Tt = null, Ot = null, kt = null, Dt = !1, M = null, N = null, Vt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(mt);
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
		this.#m || (this.#m = !0, A(() => {
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
		if (M === null) {
			let t = M = new e();
			!Dt && !Et && A(() => {
				t.#e || t.flush();
			});
		}
		return M;
	}
	apply() {
		N = null;
	}
	schedule(e) {
		if (Tt = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		for (var t = e; t.parent !== null;) {
			t = t.parent;
			var n = t.f;
			if (Ot !== null && t === G && (H === null || !(H.f & 2))) return;
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
			e === null || (e.#n = t), t === null ? Ct = e : t.#t = e, this.linked = !1;
		}
	}
};
function Nt(e) {
	var t = Et;
	Et = !0;
	try {
		var n;
		for (e && (M !== null && !M.is_fork && M.flush(), n = e());;) {
			if (Ge(), M === null) return n;
			M.flush();
		}
	} finally {
		Et = t;
	}
}
function Pt() {
	try {
		be();
	} catch (e) {
		qe(e, Tt);
	}
}
var Ft = null;
function It(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && Wn(r) && (Ft = /* @__PURE__ */ new Set(), Yn(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && Tn(r), Ft?.size > 0)) {
				Vt.clear();
				for (let e of Ft) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) Ft.has(n) && (Ft.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || Yn(n);
					}
				}
				Ft.clear();
			}
		}
		Ft = null;
	}
}
function Lt(e) {
	M.schedule(e);
}
function Rt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), j(e, m);
		for (var n = e.first; n !== null;) Rt(n, t), n = n.next;
	}
}
function zt(e) {
	j(e, m);
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
		equals: Ie,
		rv: 0,
		wv: 0
	};
}
/*#__NO_SIDE_EFFECTS__*/
function P(e, t) {
	let n = Ut(e, t);
	return Ln(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function Wt(e, t = !1, n = !0) {
	let r = Ut(e);
	return t || (r.equals = Re), r;
}
function F(e, t, n = !1) {
	return H !== null && (!U || H.f & 131072) && He() && H.f & 4325394 && (In === null || !In.has(e)) && we(), Gt(e, n ? Yt(t) : t, kt);
}
function Gt(e, t, n = null) {
	if (!e.equals(t)) {
		Vt.set(e, Nn ? t : e.v);
		var r = Mt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && yt(t), N === null && Ye(t);
		}
		e.wv = Un(), Jt(e, h, n), He() && G !== null && G.f & 1024 && !(G.f & 96) && (J === null ? Rn([e]) : J.push(e)), !r.is_fork && Bt.size > 0 && !Ht && Kt();
	}
	return t;
}
function Kt() {
	Ht = !1;
	for (let e of Bt) {
		e.f & 1024 && j(e, g);
		let t;
		try {
			t = Wn(e);
		} catch {
			t = !0;
		}
		t && Yn(e);
	}
	Bt.clear();
}
function qt(e) {
	F(e, e.v + 1);
}
function Jt(e, t, n) {
	var r = e.reactions;
	if (r !== null) for (var i = He(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === G)) {
			var l = (c & h) === 0;
			if (l && j(s, t), c & 131072) Bt.add(s);
			else if (c & 2) {
				var u = s;
				N?.delete(u), c & 65536 || (c & 512 && (G === null || !(G.f & 2097152)) && (s.f |= C), Jt(u, g, n));
			} else if (l) {
				var d = s;
				c & 16 && Ft !== null && Ft.add(d), n === null ? Lt(d) : n.push(d);
			}
		}
	}
}
function Yt(t) {
	if (typeof t != "object" || !t || ae in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ P(0), u = null, d = Vn, f = (e) => {
		if (Vn === d) return e();
		var t = H, n = Vn;
		W(null), Hn(d);
		var r = e();
		return W(t), Hn(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ P(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && Se();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ P(n.value, u);
				return r.set(t, e), e;
			}) : F(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ P(w, u));
					r.set(t, e), qt(o);
				}
			} else F(n, w), qt(o);
			return !0;
		},
		get(e, n, i) {
			if (n === ae) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ P(Yt(s ? e[n] : w), u)), r.set(n, o)), o !== void 0) {
				var c = Y(o);
				return c === w ? void 0 : c;
			}
			return Reflect.get(e, n, i);
		},
		getOwnPropertyDescriptor(e, t) {
			var n = Reflect.getOwnPropertyDescriptor(e, t);
			if (n && "value" in n) {
				var i = r.get(t);
				i && (n.value = Y(i));
			} else if (n === void 0) {
				var a = r.get(t), o = a?.v;
				if (a !== void 0 && o !== w) return {
					enumerable: !0,
					configurable: !0,
					value: o,
					writable: !0
				};
			}
			return n;
		},
		has(e, t) {
			if (t === ae) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== w || Reflect.has(e, t);
			return (n !== void 0 || G !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ P(i ? Yt(e[t]) : w, u)), r.set(t, n)), Y(n) === w) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ P(w, u)), r.set(d + "", p)) : F(p, w);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ P(void 0, u)), F(c, Yt(n)), r.set(t, c));
			else {
				l = c.v !== w;
				var m = f(() => Yt(n));
				F(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && F(g, _ + 1);
				}
				qt(o);
			}
			return !0;
		},
		ownKeys(e) {
			Y(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== w;
			});
			for (var [n, i] of r) i.v !== w && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			Ce();
		}
	});
}
var Xt, Zt, Qt, $t;
function en() {
	if (Xt === void 0) {
		Xt = window, Zt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		Qt = a(t, "firstChild").get, $t = a(t, "nextSibling").get, u(e) && (e[le] = void 0, e[ce] = null, e[ue] = void 0, e.__e = void 0), u(n) && (n[de] = void 0);
	}
}
function I(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function L(e) {
	return Qt.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function tn(e) {
	return $t.call(e);
}
function R(e, t) {
	if (!T) return /* @__PURE__ */ L(e);
	var n = /* @__PURE__ */ L(E);
	if (n === null) n = E.appendChild(I());
	else if (t && n.nodeType !== 3) {
		var r = I();
		return n?.before(r), D(r), r;
	}
	return t && sn(n), D(n), n;
}
function nn(e, t = !1) {
	if (!T) {
		var n = /* @__PURE__ */ L(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ tn(n) : n;
	}
	if (t) {
		if (E?.nodeType !== 3) {
			var r = I();
			return E?.before(r), D(r), r;
		}
		sn(E);
	}
	return E;
}
function z(e, t = 1, n = !1) {
	let r = T ? E : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ tn(r);
	if (!T) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = I();
			return r === null ? i?.after(a) : r.before(a), D(a), a;
		}
		sn(r);
	}
	return D(r), r;
}
function rn(e) {
	e.textContent = "";
}
function an() {
	return !1;
}
function on(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function sn(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/effects.js
function cn(e) {
	G === null && (H === null && ye(e), ve()), Nn && _e(e);
}
function ln(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function un(e, t) {
	var n = G;
	n !== null && n.f & 8192 && (e |= _);
	var r = {
		ctx: k,
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
	M?.register_created_effect(r);
	var i = r;
	if (e & 4) Ot === null ? Mt.ensure().schedule(r) : Ot.push(r);
	else if (t !== null) {
		try {
			Yn(r);
		} catch (e) {
			throw V(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= x));
	}
	if (i !== null && (i.parent = n, n !== null && ln(i, n), H !== null && H.f & 2 && !(e & 64))) {
		var a = H;
		(a.effects ??= []).push(i);
	}
	return r;
}
function dn() {
	return H !== null && !U;
}
function fn(e) {
	let t = un(8, null);
	return j(t, m), t.teardown = e, t;
}
function pn(e) {
	cn("$effect");
	var t = G.f;
	if (!H && t & 32 && k !== null && !k.i) {
		var n = k;
		(n.e ??= []).push(e);
	} else return mn(e);
}
function mn(e) {
	return un(4 | ee, e);
}
function hn(e) {
	Mt.ensure();
	let t = un(64 | S, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? En(t, () => {
			V(t), n(void 0);
		}) : (V(t), n(void 0));
	});
}
function gn(e) {
	return un(4, e);
}
function _n(e) {
	return un(re | S, e);
}
function vn(e, t = 0) {
	return un(8 | t, e);
}
function yn(e, t = [], n = [], r = []) {
	lt(r, t, n, (t) => {
		un(8, () => {
			e(...t.map(Y));
		});
	});
}
function bn(e, t = 0) {
	return un(16 | t, e);
}
function B(e) {
	return un(32 | S, e);
}
function xn(e) {
	var t = e.teardown;
	if (t !== null) {
		let e = Nn, n = H;
		Pn(!0), W(null);
		try {
			t.call(null);
		} finally {
			Pn(e), W(n);
		}
	}
}
function Sn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && rt(() => {
			e.abort(pe);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : V(n, t), n = r;
	}
}
function Cn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || V(t), t = n;
	}
}
function V(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (wn(e.nodes.start, e.nodes.end), n = !0), e.f |= b, Sn(e, t && !n), Jn(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	xn(e), e.f ^= b, e.f |= v;
	var i = e.parent;
	i !== null && i.first !== null && Tn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function wn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ tn(e);
		e.remove(), e = n;
	}
}
function Tn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function En(e, t, n = !0) {
	var r = [];
	Dn(e, r, !0);
	var i = () => {
		n && V(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function Dn(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= _;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				Dn(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function On(e) {
	kn(e, !0);
}
function kn(e, t) {
	if (e.f & 8192) {
		e.f ^= _, e.f & 1024 || (j(e, h), Mt.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			kn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function An(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ tn(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/legacy.js
var jn = null, Mn = !1, Nn = !1;
function Pn(e) {
	Nn = e;
}
var H = null, U = !1;
function W(e) {
	H = e;
}
var G = null;
function Fn(e) {
	G = e;
}
var In = null;
function Ln(e) {
	H !== null && (In ??= /* @__PURE__ */ new Set()).add(e);
}
var K = null, q = 0, J = null;
function Rn(e) {
	J = e;
}
var zn = 1, Bn = 0, Vn = Bn;
function Hn(e) {
	Vn = e;
}
function Un() {
	return ++zn;
}
function Wn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 2 && (e.f &= ~C), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (Wn(a) && bt(a), a.wv > e.wv) return !0;
		}
		t & 512 && N === null && j(e, m);
	}
	return !1;
}
function Gn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(In !== null && In.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Gn(a, t, !1) : t === a && (n ? j(a, h) : a.f & 1024 && j(a, g), Lt(a));
	}
}
function Kn(e) {
	var t = K, n = q, r = J, i = H, a = In, o = k, s = U, c = Vn, l = e.f;
	K = null, q = 0, J = null, H = l & 96 ? null : e, In = null, ze(e.ctx), U = !1, Vn = ++Bn, e.ac !== null && (rt(() => {
		e.ac.abort(pe);
	}), e.ac = null);
	try {
		e.f |= ne;
		var u = e.fn, d = u();
		e.f |= y;
		var f = e.deps, p = M?.is_fork;
		if (K !== null) {
			var m;
			if (p || Jn(e, q), f !== null && q > 0) for (f.length = q + K.length, m = 0; m < K.length; m++) f[q + m] = K[m];
			else e.deps = f = K;
			if (dn() && e.f & 512) for (m = q; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && q < f.length && (Jn(e, q), f.length = q);
		if (He() && J !== null && !U && f !== null && !(e.f & 6146)) for (m = 0; m < J.length; m++) Gn(J[m], e);
		if (i !== null && i !== e) {
			if (Bn++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = Bn;
			if (t !== null) for (let e of t) e.rv = Bn;
			J !== null && (r === null ? r = J : r.push(...J));
		}
		return e.f & 8388608 && (e.f ^= ie), d;
	} catch (e) {
		return Ke(e);
	} finally {
		e.f ^= ne, K = t, q = n, J = r, H = i, In = a, ze(o), U = s, Vn = c;
	}
}
function qn(e, r) {
	let i = r.reactions;
	if (i !== null) {
		var a = t.call(i, e);
		if (a !== -1) {
			var o = i.length - 1;
			o === 0 ? i = r.reactions = null : (i[a] = i[o], i.pop());
		}
	}
	if (i === null && r.f & 2 && (K === null || !n.call(K, r))) {
		var s = r;
		s.f & 512 && (s.f ^= 512, s.f &= ~C), s.v !== w && Ye(s), s.ac !== null && rt(() => {
			s.ac.abort(pe), s.ac = null, j(s, h);
		}), xt(s), Jn(s, 0);
	}
}
function Jn(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) qn(e, n[r]);
}
function Yn(e) {
	var t = e.f;
	if (!(t & 16384)) {
		j(e, m);
		var n = G, r = Mn;
		G = e, Mn = !(t & 96);
		try {
			t & 16777232 ? Cn(e) : Sn(e), xn(e);
			var i = Kn(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = zn;
		} finally {
			Mn = r, G = n;
		}
	}
}
async function Xn() {
	await Promise.resolve(), Nt();
}
function Y(e) {
	var t = !!(e.f & 2);
	if (jn?.add(e), H !== null && !U && !(G !== null && G.f & 16384) && (In === null || !In.has(e))) {
		var r = H.deps;
		if (H.f & 2097152) e.rv < Bn && (e.rv = Bn, K === null && r !== null && r[q] === e ? q++ : K === null ? K = [e] : K.push(e));
		else {
			H.deps ??= [], n.call(H.deps, e) || H.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [H] : n.call(i, H) || i.push(H);
		}
	}
	if (Nn && Vt.has(e)) return Vt.get(e);
	if (t) {
		var a = e;
		if (Nn) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || Qn(a)) && (o = yt(a)), Vt.set(a, o), o;
		}
		var s = !(a.f & 512) && !U && H !== null && (Mn || !!(H.f & 512)), c = (a.f & y) === 0;
		Wn(a) && (s && (a.f |= 512), bt(a)), s && !c && (St(a), Zn(a));
	}
	if (N?.has(e)) return N.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function Zn(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (St(t), Zn(t));
}
function Qn(e) {
	if (e.v === w) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (Vt.has(t) || t.f & 2 && Qn(t)) return !0;
	return !1;
}
function $n(e) {
	var t = U;
	try {
		return U = !0, e();
	} finally {
		U = t;
	}
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var er = ["touchstart", "touchmove"];
function tr(e) {
	return er.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/events.js
var nr = Symbol("events"), rr = /* @__PURE__ */ new Set(), ir = /* @__PURE__ */ new Set();
function ar(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || ur.call(t, e), !e.cancelBubble) return rt(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? A(() => {
		t.addEventListener(e, i, r);
	}) : t.addEventListener(e, i, r), i;
}
function or(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = ar(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && fn(() => {
		t.removeEventListener(e, o, a);
	});
}
function sr(e, t, n) {
	(t[nr] ??= {})[e] = n;
}
function cr(e) {
	for (var t = 0; t < e.length; t++) rr.add(e[t]);
	for (var n of ir) n(e);
}
var lr = null;
function ur(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	lr = e;
	var s = 0, c = lr === e && e[nr];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[nr] = t;
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
		var d = H, f = G;
		W(null), Fn(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[nr]?.[r];
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
			e[nr] = t, delete e.currentTarget, W(d), Fn(f);
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
	var t = on("template");
	return t.innerHTML = fr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/template.js
function X(e, t) {
	var n = G;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function Z(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (T) return X(E, null), E;
		i === void 0 && (i = pr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ L(i)));
		var t = r || Zt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ L(t), s = t.lastChild;
			X(o, s);
		} else X(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function mr(e, t, n = "svg") {
	var r = !e.startsWith("<!>"), i = !!(t & 1), a = `<${n}>${r ? e : "<!>" + e}</${n}>`, o;
	return () => {
		if (T) return X(E, null), E;
		if (!o) {
			var e = /* @__PURE__ */ L(pr(a));
			if (i) for (o = document.createDocumentFragment(); /* @__PURE__ */ L(e);) o.appendChild(/* @__PURE__ */ L(e));
			else o = /* @__PURE__ */ L(e);
		}
		var t = o.cloneNode(!0);
		if (i) {
			var n = /* @__PURE__ */ L(t), r = t.lastChild;
			X(n, r);
		} else X(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function hr(e, t) {
	return /* @__PURE__ */ mr(e, t, "svg");
}
function gr(e = "") {
	if (!T) {
		var t = I(e + "");
		return X(t, t), t;
	}
	var n = E;
	return n.nodeType === 3 ? sn(n) : (n.before(n = I()), D(n)), X(n, n), n;
}
function _r() {
	if (T) return X(E, null), E;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = I();
	return e.append(t, n), X(t, n), e;
}
function Q(e, t) {
	if (T) {
		var n = G;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = E), Me();
		return;
	}
	e !== null && e.before(t);
}
function $(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[de] ??= e.nodeValue) && (e[de] = n, e.nodeValue = `${n}`);
}
function vr(e, t) {
	return br(e, t);
}
var yr = /* @__PURE__ */ new Map();
function br(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	en();
	var l = void 0, u = hn(() => {
		var s = n ?? t.appendChild(I());
		st(s, { pending: () => {} }, (t) => {
			Be({});
			var n = k;
			if (o && (n.c = o), a && (i.$$events = a), T && X(t, null), l = e(t, i) || {}, T && (G.nodes.end = E, E === null || E.nodeType !== 8 || E.data !== "]")) throw ke(), Ee;
			Ve();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = tr(r);
					for (let e of [t, document]) {
						var a = yr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), yr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, ur, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(rr)), ir.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = yr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, ur), r.delete(e), r.size === 0 && yr.delete(n)) : r.set(e, i);
			}
			ir.delete(d), s !== n && s.parentNode?.removeChild(s);
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
			if (n) On(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (On(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
			}
			for (let [t, n] of this.#e) {
				if (this.#e.delete(t), t === e) break;
				let r = this.#n.get(n);
				r && (V(r.effect), this.#n.delete(n));
			}
			for (let [e, r] of this.#t) {
				if (e === t || this.#r.has(e)) continue;
				let i = () => {
					if (Array.from(this.#e.values()).includes(e)) {
						var t = document.createDocumentFragment();
						An(r, t), t.append(I()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else V(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), En(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (V(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = M, r = an();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = I();
				i.append(a), this.#n.set(e, {
					effect: B(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, B(() => t(this.anchor)));
		}
		if (this.#e.set(n, e), r) {
			for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(this.#a), n.ondiscard(this.#o);
		} else T && (this.anchor = E), this.#a(n);
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/if.js
function wr(e, t, n = !1) {
	var r;
	T && (r = E, Me());
	var i = new Cr(e), a = n ? x : 0;
	function o(e, t) {
		if (T) {
			var n = Fe(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Pe();
				D(a), i.anchor = a, je(!1), i.ensure(e, t), je(!0);
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
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/each.js
function Tr(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		En(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					Er(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = i.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			rn(d), d.append(u), e.items.clear();
		}
		Er(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function Er(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= te, An(a, document.createDocumentFragment())) : V(t[i], n);
	}
}
var Dr;
function Or(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = T ? D(/* @__PURE__ */ L(u)) : u.appendChild(I());
	}
	T && Me();
	var d = null, f = /* @__PURE__ */ _t(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, Ar(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= te, Mr(d, null, c)) : On(d) : En(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: bn(() => {
			p = Y(f);
			var e = p.length;
			let t = !1;
			T && Fe(c) === "[!" != (e === 0) && (c = Pe(), D(c), je(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = M, v = an(), y = 0; y < e; y += 1) {
				T && E.nodeType === 8 && E.data === "]" && (c = E, t = !0, je(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Gt(S.v, b), S.i && Gt(S.i, y), v && u.unskip_effect(S.e)) : (S = jr(l, h ? c : Dr ??= I(), b, x, y, o, n, i), h || (S.e.f |= te), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = B(() => s(c)) : (d = B(() => s(Dr ??= I())), d.f |= te)), e > r.size && ge("", "", ""), T && e > 0 && D(Pe()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && je(!0), Y(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, T && (c = E);
}
function kr(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function Ar(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = kr(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (On(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= te, _ === l) Mr(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), Nr(e, d, _), Nr(e, _, y), Mr(_, y, n), d = _, p = [], m = [], l = kr(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], ee = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) Mr(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					Nr(e, S.prev, ee.next), Nr(e, d, S), Nr(e, ee, b), l = b, d = ee, --v, p = [], m = [];
				} else u.delete(_), Mr(_, l, n), Nr(e, _.prev, _.next), Nr(e, _, d === null ? e.effect.first : d.next), Nr(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = kr(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = kr(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (Er(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var C = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || C.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && C.push(l), l = kr(l.next);
		var ne = C.length;
		if (ne > 0) {
			var re = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < ne; v += 1) C[v].nodes?.a?.measure();
				for (v = 0; v < ne; v += 1) C[v].nodes?.a?.fix();
			}
			Tr(e, C, re);
		}
	}
	o && A(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function jr(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Ut(n) : /* @__PURE__ */ Wt(n, !1, !1) : null, l = o & 2 ? Ut(i) : null;
	return {
		v: c,
		i: l,
		e: B(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function Mr(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ tn(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function Nr(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/attributes.js
var Pr = [..." 	\n\r\f\xA0\v﻿"];
function Fr(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || Pr.includes(r[o - 1])) && (s === r.length || Pr.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
function Ir(e, t = !1) {
	var n = t ? " !important;" : ";", r = "";
	for (var i of Object.keys(e)) {
		var a = e[i];
		a != null && a !== "" && (r += " " + i + ": " + a + n);
	}
	return r;
}
function Lr(e) {
	return e[0] !== "-" || e[1] !== "-" ? e.toLowerCase() : e;
}
function Rr(e, t) {
	if (t) {
		var n = "", r, i;
		if (Array.isArray(t) ? (r = t[0], i = t[1]) : r = t, e) {
			e = String(e).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
			var a = !1, o = 0, s = !1, c = [];
			r && c.push(...Object.keys(r).map(Lr)), i && c.push(...Object.keys(i).map(Lr));
			var l = 0, u = -1;
			let t = e.length;
			for (var d = 0; d < t; d++) {
				var f = e[d];
				if (s ? f === "/" && e[d - 1] === "*" && (s = !1) : a ? a === f && (a = !1) : f === "/" && e[d + 1] === "*" ? s = !0 : f === "\"" || f === "'" ? a = f : f === "(" ? o++ : f === ")" && o--, !s && a === !1 && o === 0) {
					if (f === ":" && u === -1) u = d;
					else if (f === ";" || d === t - 1) {
						if (u !== -1) {
							var p = Lr(e.substring(l, u).trim());
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
		return r && (n += Ir(r)), i && (n += Ir(i, !0)), n = n.trim(), n === "" ? null : n;
	}
	return e == null ? null : String(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/class.js
function zr(e, t, n, r, i, a) {
	var o = e[le];
	if (T || o !== n || o === void 0) {
		var s = Fr(n, r, a);
		(!T || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[le] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/style.js
function Br(e, t = {}, n, r) {
	for (var i in n) {
		var a = n[i];
		t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
	}
}
function Vr(e, t, n, r) {
	var i = e[ue];
	if (T || i !== t) {
		var a = Rr(t, r);
		(!T || a !== e.getAttribute("style")) && (a == null ? e.removeAttribute("style") : e.style.cssText = a), e[ue] = t;
	} else r && (Array.isArray(r) ? (Br(e, n?.[0], r[0]), Br(e, n?.[1], r[1], "important")) : Br(e, n, r));
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var Hr = Symbol("is custom element"), Ur = Symbol("is html"), Wr = me ? "link" : "LINK";
function Gr(e) {
	if (T) {
		var t = !1, n = () => {
			if (!t) {
				if (t = !0, e.hasAttribute("value")) {
					var n = e.value;
					Kr(e, "value", null), e.value = n;
				}
				if (e.hasAttribute("checked")) {
					var r = e.checked;
					Kr(e, "checked", null), e.checked = r;
				}
			}
		};
		e[fe] = n, A(n), nt();
	}
}
function Kr(e, t, n, r) {
	var i = qr(e);
	T && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Wr) || i[t] !== (i[t] = n) && (t === "loading" && (e[se] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && Yr(e).includes(t) ? e[t] = n : e.setAttribute(t, n));
}
function qr(e) {
	return e[ce] ??= {
		[Hr]: e.nodeName.includes("-"),
		[Ur]: e.namespaceURI === De
	};
}
var Jr = /* @__PURE__ */ new Map();
function Yr(e) {
	var t = e.getAttribute("is") || e.nodeName, n = Jr.get(t);
	if (n) return n;
	Jr.set(t, n = []);
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.push(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
function Xr(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet();
	it(e, "input", async (i) => {
		var a = i ? e.defaultValue : e.value;
		if (a = Zr(e) ? Qr(a) : a, n(a), M !== null && r.add(M), await Xn(), a !== (a = t())) {
			var o = e.selectionStart, s = e.selectionEnd, c = e.value.length;
			if (e.value = a ?? "", s !== null) {
				var l = e.value.length;
				o === s && s === c && l > c ? (e.selectionStart = l, e.selectionEnd = l) : (e.selectionStart = o, e.selectionEnd = Math.min(s, l));
			}
		}
	}), (T && e.defaultValue !== e.value || $n(t) == null && e.value) && (n(Zr(e) ? Qr(e.value) : e.value), M !== null && r.add(M)), vn(() => {
		var n = t();
		if (e === document.activeElement) {
			var i = M;
			if (r.has(i)) return;
		}
		Zr(e) && n === Qr(e.value) || e.type === "date" && !n && !e.value || n !== e.value && (e.value = n ?? "");
	});
}
function Zr(e) {
	var t = e.type;
	return t === "number" || t === "range";
}
function Qr(e) {
	return e === "" ? null : +e;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function $r(e, t) {
	return e === t || e?.[ae] === t;
}
function ei(e = {}, t, n, r) {
	var i = k.r, a = G;
	return gn(() => {
		var o, s;
		return vn(() => {
			o = s, s = r?.() || [], $n(() => {
				$r(n(...s), e) || (t(e, ...s), o && $r(n(...o), e) && t(null, ...o));
			});
		}), () => {
			let r = a;
			for (; r !== i && r.parent !== null && r.parent.f & 33554432;) r = r.parent;
			let o = () => {
				s && $r(n(...s), e) && t(null, ...s);
			}, c = r.teardown;
			r.teardown = () => {
				o(), c?.();
			};
		};
	}), e;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/props.js
function ti(e, t, n, r) {
	var i = !0, o = !!(n & 8), s = !!(n & 16), c = r, l = !0, u = void 0, d = () => s && i ? (u ??= /* @__PURE__ */ pt(r), Y(u)) : (l && (l = !1, c = s ? $n(r) : r), c);
	let f;
	if (o) {
		var p = ae in e || oe in e;
		f = a(e, t)?.set ?? (p && t in e ? (n) => e[t] = n : void 0);
	}
	var m, h = !1;
	o ? [m, h] = $e(() => e[t]) : m = e[t], m === void 0 && r !== void 0 && (m = d(), f && (i && xe(t), f(m)));
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
	var v = !1, y = (n & 1 ? pt : _t)(() => (v = !1, g()));
	o && Y(y);
	var b = G;
	return (function(e, t) {
		if (arguments.length > 0) {
			let n = t ? Y(y) : i && o ? Yt(e) : e;
			return F(y, n), v = !0, c !== void 0 && (c = n), e;
		}
		return Nn && v || b.f & 16384 ? y.v : Y(y);
	});
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region weather/src/WeatherIcon.svelte
var ni = /* @__PURE__ */ hr("<circle cx=\"20\" cy=\"16\" r=\"7\" fill=\"currentColor\"></circle><g stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M20 3v3M20 26v3M7 16h3M30 16h3M11 7l2 2M27 23l2 2M29 7l-2 2M13 23l-2 2\"></path></g>", 1), ri = /* @__PURE__ */ hr("<path d=\"M25 6a11 11 0 1 0 8 12A9 9 0 0 1 25 6z\" fill=\"currentColor\"></path>"), ii = /* @__PURE__ */ hr("<g stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M14 28l-1 3M20 28l-1 3M26 28l-1 3\"></path></g>"), ai = /* @__PURE__ */ hr("<g fill=\"currentColor\"><circle cx=\"14\" cy=\"30\" r=\"1.6\"></circle><circle cx=\"20\" cy=\"30\" r=\"1.6\"></circle><circle cx=\"26\" cy=\"30\" r=\"1.6\"></circle></g>"), oi = /* @__PURE__ */ hr("<g stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-opacity=\"0.7\"><path d=\"M11 29h18M14 32h12\"></path></g>"), si = /* @__PURE__ */ hr("<path d=\"M21 26l-6 6h4l-2 5 7-7h-4l2-4z\" fill=\"currentColor\"></path>"), ci = /* @__PURE__ */ hr("<path d=\"M12 26a7 7 0 0 1-.6-14A9 9 0 0 1 29 13a6.5 6.5 0 0 1-.5 13z\" fill=\"currentColor\" fill-opacity=\"0.9\"></path><!>", 1), li = /* @__PURE__ */ hr("<svg viewBox=\"0 0 40 32\" fill=\"none\" aria-hidden=\"true\"><!></svg>");
function ui(e, t) {
	let n = ti(t, "class", 3, "h-9 w-11"), r = /* @__PURE__ */ gt(() => i(t.code, t.isDay));
	function i(e, t) {
		return e <= 1 ? a(t) : o(e);
	}
	function a(e) {
		return e ? "sun" : "moon";
	}
	function o(e) {
		return e <= 3 ? "cloud" : e <= 48 ? "fog" : e <= 67 ? "rain" : e <= 77 ? "snow" : e <= 82 ? "rain" : e <= 86 ? "snow" : "thunder";
	}
	var s = li(), c = R(s), l = (e) => {
		var t = ni();
		Ne(), Q(e, t);
	}, u = (e) => {
		Q(e, ri());
	}, d = (e) => {
		var t = ci(), n = z(nn(t)), i = (e) => {
			Q(e, ii());
		}, a = (e) => {
			Q(e, ai());
		}, o = (e) => {
			Q(e, oi());
		}, s = (e) => {
			Q(e, si());
		};
		wr(n, (e) => {
			Y(r) === "rain" ? e(i) : Y(r) === "snow" ? e(a, 1) : Y(r) === "fog" ? e(o, 2) : Y(r) === "thunder" && e(s, 3);
		}), Q(e, t);
	};
	wr(c, (e) => {
		Y(r) === "sun" ? e(l) : Y(r) === "moon" ? e(u, 1) : e(d, -1);
	}), O(s), yn(() => zr(s, 0, `shrink-0 ${n() ?? ""}`)), Q(e, s);
}
//#endregion
//#region weather/src/lib.ts
var di = -999;
function fi(e) {
	return typeof e != "object" || !e ? {} : e;
}
function pi(e) {
	return typeof e == "string" ? e : "";
}
function mi(e, t) {
	return typeof e == "number" ? e : t;
}
function hi(e) {
	return Array.isArray(e) ? e.flatMap(gi) : [];
}
function gi(e) {
	let t = fi(e);
	return typeof t.label != "string" || typeof t.temperature != "number" ? [] : [{
		label: t.label,
		temperature: t.temperature,
		code: mi(t.code, 0),
		isDay: t.isDay !== !1
	}];
}
function _i(e) {
	return Array.isArray(e) ? e.flatMap(vi) : [];
}
function vi(e) {
	let t = fi(e);
	return typeof t.label != "string" || !yi(t) ? [] : [{
		label: t.label,
		code: mi(t.code, 0),
		high: t.high,
		low: t.low
	}];
}
function yi(e) {
	return typeof e.high != "number" || typeof e.low != "number" ? !1 : e.high !== -999 && e.low !== -999;
}
function bi(e, t) {
	let n = e.get(t);
	if (n === void 0) throw Error(`views: service "${t}" is not available`);
	return n;
}
//#endregion
//#region weather/src/WeatherSummary.svelte
var xi = /* @__PURE__ */ Z("<div class=\"flex items-center gap-1 text-sm font-medium\"><span class=\"truncate\"> </span> <svg viewBox=\"0 0 12 12\" class=\"h-3 w-3 shrink-0\" aria-hidden=\"true\"><path d=\"M11 1L1 5.4l4.1 1.5L6.6 11z\" fill=\"currentColor\"></path></svg></div>"), Si = /* @__PURE__ */ Z("<div class=\"text-xs tabular-nums text-base-content/60\"> </div>"), Ci = /* @__PURE__ */ Z("<!> <div class=\"mt-1 truncate text-sm leading-snug text-base-content/90\"> </div> <!>", 1), wi = /* @__PURE__ */ Z("<div class=\"flex flex-1 flex-col justify-between\"><div class=\"min-w-0\"><!> <div class=\"text-5xl leading-tight font-light tabular-nums\"> </div></div> <div class=\"min-w-0\"><!></div></div>"), Ti = /* @__PURE__ */ Z("<div class=\"flex items-start justify-between gap-3\"><div class=\"min-w-0\"><!> <div class=\"text-5xl leading-tight font-light tabular-nums\"> </div></div> <div class=\"flex min-w-0 flex-col items-end text-right\"><!></div></div>");
function Ei(e, t) {
	Be(t, !0);
	let n = (e) => {
		var n = xi(), r = R(n), i = R(r, !0);
		O(r), Ne(2), O(n), yn(() => $(i, t.current.place)), Q(e, n);
	}, r = (e, n = d) => {
		var r = Ci(), a = nn(r);
		ui(a, {
			get code() {
				return t.current.code;
			},
			get isDay() {
				return t.current.isDay;
			},
			get class() {
				return n();
			}
		});
		var o = z(a, 2), s = R(o, !0);
		O(o);
		var c = z(o, 2), l = (e) => {
			var n = Si(), r = R(n);
			O(n), yn(() => $(r, `H:${t.current.high ?? ""}° L:${t.current.low ?? ""}°`)), Q(e, n);
		};
		wr(c, (e) => {
			Y(i) && e(l);
		}), yn(() => $(s, t.current.description)), Q(e, r);
	}, i = /* @__PURE__ */ gt(() => t.current.high !== -999 && t.current.low !== -999);
	var a = _r(), o = nn(a), s = (e) => {
		var i = wi(), a = R(i), o = R(a);
		n(o);
		var s = z(o, 2), c = R(s);
		O(s), O(a);
		var l = z(a, 2), u = R(l);
		r(u, () => "h-9 w-11"), O(l), O(i), yn(() => $(c, `${t.current.temperature ?? ""}${t.current.unit ?? ""}`)), Q(e, i);
	}, c = (e) => {
		var i = Ti(), a = R(i), o = R(a);
		n(o);
		var s = z(o, 2), c = R(s);
		O(s), O(a);
		var l = z(a, 2), u = R(l);
		r(u, () => "h-8 w-10"), O(l), O(i), yn(() => $(c, `${t.current.temperature ?? ""}${t.current.unit ?? ""}`)), Q(e, i);
	};
	wr(o, (e) => {
		t.stacked ? e(s) : e(c, -1);
	}), Q(e, a), Ve();
}
//#endregion
//#region weather/src/WeatherSettings.svelte
var Di = /* @__PURE__ */ Z("<form class=\"flex h-full flex-col justify-between gap-2\"><label class=\"flex flex-col gap-1\"><span class=\"text-xs text-base-content/60\">Location</span> <input class=\"w-full min-w-0 rounded-lg bg-base-100/60 px-2 py-1 text-sm ring-1\n        ring-base-content/15 outline-none focus:ring-base-content/40\" type=\"text\" placeholder=\"City\"/></label> <div class=\"flex items-center justify-between gap-2\"><span class=\"text-xs text-base-content/60\">Units</span> <button class=\"rounded-lg bg-base-100/60 px-2 py-1 text-xs tabular-nums ring-1 ring-base-content/15\" type=\"button\"><!></button></div> <div class=\"flex gap-2\"><button class=\"flex-1 rounded-lg px-2 py-1 text-xs ring-1 ring-base-content/15\" type=\"button\">Cancel</button> <button class=\"flex-1 rounded-lg bg-primary px-2 py-1 text-xs text-primary-content\" type=\"submit\">Done</button></div></form>");
function Oi(e, t) {
	Be(t, !0);
	let n = /* @__PURE__ */ P(Yt($n(() => t.place))), r = /* @__PURE__ */ P(Yt($n(() => t.imperial)));
	function i(e) {
		e.preventDefault(), t.onsave(Y(n).trim(), Y(r));
	}
	var a = Di(), o = R(a), s = z(R(o), 2);
	Gr(s), et(s, !0), O(o);
	var c = z(o, 2), l = z(R(c), 2), u = R(l), d = (e) => {
		Q(e, gr("°F"));
	}, f = (e) => {
		Q(e, gr("°C"));
	};
	wr(u, (e) => {
		Y(r) ? e(d) : e(f, -1);
	}), O(l), O(c);
	var p = z(c, 2), m = R(p);
	Ne(2), O(p), O(a), or("submit", a, i), Xr(s, () => Y(n), (e) => F(n, e)), sr("click", l, () => F(r, !Y(r))), sr("click", m, function(...e) {
		t.oncancel?.apply(this, e);
	}), Q(e, a), Ve();
}
cr(["click"]);
//#endregion
//#region weather/src/HourlyStrip.svelte
var ki = /* @__PURE__ */ Z("<div class=\"flex min-w-0 flex-1 flex-col items-center gap-1\"><div class=\"text-xs text-base-content/60\"> </div> <!> <div class=\"text-sm tabular-nums\"> </div></div>"), Ai = /* @__PURE__ */ Z("<div></div>");
function ji(e, t) {
	let n = ti(t, "class", 3, "");
	var r = Ai();
	Or(r, 21, () => t.hours, (e) => e.label, (e, t) => {
		var n = ki(), r = R(n), i = R(r, !0);
		O(r);
		var a = z(r, 2);
		ui(a, {
			get code() {
				return Y(t).code;
			},
			get isDay() {
				return Y(t).isDay;
			},
			class: "h-5 w-6"
		});
		var o = z(a, 2), s = R(o);
		O(o), O(n), yn(() => {
			$(i, Y(t).label), $(s, `${Y(t).temperature ?? ""}°`);
		}), Q(e, n);
	}), O(r), yn(() => zr(r, 1, `flex items-end justify-between gap-1 ${n() ?? ""}`)), Q(e, r);
}
//#endregion
//#region weather/src/DailyList.svelte
var Mi = /* @__PURE__ */ Z("<div class=\"flex items-center gap-2\"><div class=\"w-10 shrink-0 truncate text-sm text-base-content/70\"> </div> <!> <div class=\"w-7 shrink-0 text-right text-sm tabular-nums text-base-content/60\"> </div> <div class=\"relative h-1 flex-1 rounded-full bg-base-content/15\"><div class=\"absolute h-1 rounded-full bg-linear-to-r from-info to-warning\"></div></div> <div class=\"w-7 shrink-0 text-sm tabular-nums\"> </div></div>"), Ni = /* @__PURE__ */ Z("<div></div>");
function Pi(e, t) {
	let n = ti(t, "class", 3, ""), r = /* @__PURE__ */ gt(() => i(t.days));
	function i(e) {
		if (e.length === 0) return {
			low: 0,
			span: 0
		};
		let t = Math.min(...e.map((e) => e.low));
		return {
			low: t,
			span: Math.max(...e.map((e) => e.high)) - t
		};
	}
	function a(e) {
		let t = Math.max(6, o(e.high) - o(e.low));
		return {
			left: Math.min(o(e.low), 100 - t),
			width: t
		};
	}
	function o(e) {
		return Y(r).span <= 0 ? 0 : (e - Y(r).low) / Y(r).span * 100;
	}
	var s = Ni();
	Or(s, 21, () => t.days, (e) => e.label, (e, t) => {
		let n = /* @__PURE__ */ gt(() => a(Y(t)));
		var r = Mi(), i = R(r), o = R(i, !0);
		O(i);
		var s = z(i, 2);
		ui(s, {
			get code() {
				return Y(t).code;
			},
			isDay: !0,
			class: "h-5 w-6"
		});
		var c = z(s, 2), l = R(c);
		O(c);
		var u = z(c, 2), d = R(u);
		let f;
		O(u);
		var p = z(u, 2), m = R(p);
		O(p), O(r), yn(() => {
			$(o, Y(t).label), $(l, `${Y(t).low ?? ""}°`), f = Vr(d, "", f, {
				left: `${Y(n).left ?? ""}%`,
				width: `${Y(n).width ?? ""}%`
			}), $(m, `${Y(t).high ?? ""}°`);
		}), Q(e, r);
	}), O(s), yn(() => zr(s, 1, `flex flex-col justify-between ${n() ?? ""}`)), Q(e, s);
}
//#endregion
//#region weather/src/Weather.svelte
var Fi = /* @__PURE__ */ Z("<button class=\"absolute top-2 right-2 rounded-full p-1.5 text-base-content/70 opacity-0\n        transition group-hover:opacity-100 hover:bg-base-content/10 hover:text-base-content\" type=\"button\" title=\"Edit Weather\" aria-label=\"Edit Weather\"><svg viewBox=\"0 0 16 16\" class=\"h-3.5 w-3.5\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm6.4 2.5c0 .4 0 .8-.1 1.1l1.3 1a.3.3 0\n            0 1 .1.4l-1.2 2.1a.3.3 0 0 1-.4.1l-1.5-.6c-.3.2-.7.5-1.1.6l-.2 1.6a.3.3 0 0 1-.3.2H8.4\n            l-.5.6h-.9a.3.3 0 0 1-.3-.2l-.2-1.6c-.4-.1-.8-.4-1.1-.6l-1.5.6a.3.3 0 0 1-.4-.1L2.3\n            10.5a.3.3 0 0 1 .1-.4l1.3-1A6 6 0 0 1 3.6 8c0-.4 0-.8.1-1.1l-1.3-1a.3.3 0 0 1-.1-.4\n            l1.2-2.1a.3.3 0 0 1 .4-.1l1.5.6c.3-.2.7-.5 1.1-.6l.2-1.6a.3.3 0 0 1 .3-.2h2.4a.3.3 0\n            0 1 .3.2l.2 1.6c.4.1.8.4 1.1.6l1.5-.6a.3.3 0 0 1 .4.1l1.2 2.1a.3.3 0 0 1-.1.4l-1.3 1\n            c.1.3.1.7.1 1.1z\"></path></svg></button>"), Ii = /* @__PURE__ */ Z("<div class=\"text-sm font-medium\">Weather</div> <div class=\"text-xs leading-snug text-base-content/60\">No location set. Use the gear to pick one.</div>", 1), Li = /* @__PURE__ */ Z("<!> <!>", 1), Ri = /* @__PURE__ */ Z("<!> <!> <!>", 1), zi = /* @__PURE__ */ Z("<div class=\"group relative flex h-full w-full flex-col gap-3 rounded-3xl bg-base-300/65 p-4\n    text-base-content shadow-lg ring-1 ring-base-content/10 backdrop-blur-xl select-none\"><!> <!></div>");
function Bi(e, t) {
	Be(t, !0);
	let n = 1e4, r = /* @__PURE__ */ P(void 0), i = /* @__PURE__ */ P(0), a = /* @__PURE__ */ P(0), o = /* @__PURE__ */ P(null), s = /* @__PURE__ */ P(!1), c = /* @__PURE__ */ gt(() => _(Y(i), Y(a))), l = /* @__PURE__ */ gt(() => g(Y(o)));
	pn(() => (t.bus.call("weather:watch", { id: t.id }, n), t.bus.subscribe(`weather.current/${t.id}`, (e) => {
		v(fi(e.data));
	}))), pn(() => {
		let e = Y(r);
		if (e === void 0) return;
		let t = new ResizeObserver(() => u(e));
		return t.observe(e), u(e), () => t.disconnect();
	});
	function u(e) {
		F(i, e.clientWidth, !0), F(a, e.clientHeight, !0);
	}
	function d(e, r) {
		F(s, !1), t.bus.call("config:set", {
			key: `weather.cards.${t.id}`,
			value: {
				...f(e),
				units: p(r)
			}
		}, n);
	}
	function f(e) {
		return e === "" ? {} : { place: e };
	}
	function p(e) {
		return e ? "imperial" : "metric";
	}
	function m(e) {
		return e === null ? "" : e.place;
	}
	function h(e) {
		return e !== null && e.unit === "°F";
	}
	function g(e) {
		return e === null ? [] : e.days.slice(1);
	}
	function _(e, t) {
		return e < 300 ? "small" : t < 300 ? "medium" : "large";
	}
	function v(e) {
		typeof e.temperature == "number" && F(o, {
			place: pi(e.place),
			temperature: e.temperature,
			unit: pi(e.unit),
			code: mi(e.code, 0),
			description: pi(e.description),
			isDay: e.isDay !== !1,
			high: mi(e.high, di),
			low: mi(e.low, di),
			hours: hi(e.hours),
			days: _i(e.days)
		}, !0);
	}
	var y = zi(), b = R(y), x = (e) => {
		var t = Fi();
		sr("click", t, () => F(s, !0)), Q(e, t);
	};
	wr(b, (e) => {
		Y(s) || e(x);
	});
	var S = z(b, 2), ee = (e) => {
		{
			let t = /* @__PURE__ */ gt(() => m(Y(o))), n = /* @__PURE__ */ gt(() => h(Y(o)));
			Oi(e, {
				get place() {
					return Y(t);
				},
				get imperial() {
					return Y(n);
				},
				onsave: d,
				oncancel: () => F(s, !1)
			});
		}
	}, te = (e) => {
		var t = Ii();
		Ne(2), Q(e, t);
	}, C = (e) => {
		Ei(e, {
			get current() {
				return Y(o);
			},
			stacked: !0
		});
	}, ne = (e) => {
		var t = Li(), n = nn(t);
		Ei(n, {
			get current() {
				return Y(o);
			},
			stacked: !1
		}), ji(z(n, 2), {
			get hours() {
				return Y(o).hours;
			},
			class: "mt-auto"
		}), Q(e, t);
	}, re = (e) => {
		var t = Ri(), n = nn(t);
		Ei(n, {
			get current() {
				return Y(o);
			},
			stacked: !1
		});
		var r = z(n, 2);
		ji(r, { get hours() {
			return Y(o).hours;
		} }), Pi(z(r, 2), {
			get days() {
				return Y(l);
			},
			class: "flex-1"
		}), Q(e, t);
	};
	wr(S, (e) => {
		Y(s) ? e(ee) : Y(o) === null ? e(te, 1) : Y(c) === "small" ? e(C, 2) : Y(c) === "medium" ? e(ne, 3) : e(re, -1);
	}), O(y), ei(y, (e) => F(r, e), () => Y(r)), Q(e, y), Ve();
}
cr(["click"]);
//#endregion
//#region weather/src/views.ts
var Vi = {
	name: "weather-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = bi(e, "ui"), n = bi(e, "bus");
		e.effect(() => Wi()), e.effect(() => t.register("weather.card", Hi(n)));
	}
};
function Hi(e) {
	return (t, n, r) => {
		let i = vr(Bi, {
			target: t,
			props: {
				bus: e,
				id: r
			}
		});
		return { dispose() {
			Sr(i);
		} };
	};
}
function Ui(e) {
	let t = e.indexOf("?");
	return t < 0 ? "" : e.slice(t);
}
function Wi() {
	if (Gi()) return () => {};
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = `/plugins/weather/views.css${Ui(import.meta.url)}`, document.head.appendChild(e), () => {
		e.remove();
	};
}
function Gi() {
	return new URL(import.meta.url).origin !== window.location.origin;
}
//#endregion
export { Vi as default };
