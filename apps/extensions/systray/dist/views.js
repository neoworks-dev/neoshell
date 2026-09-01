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
var m = 1024, h = 2048, g = 4096, _ = 8192, v = 16384, y = 32768, b = 1 << 25, x = 65536, S = 1 << 19, ee = 1 << 20, te = 1 << 25, C = 65536, ne = 1 << 21, re = 1 << 22, ie = 1 << 23, ae = Symbol("$state"), oe = Symbol(""), se = Symbol("attributes"), ce = Symbol("class"), le = Symbol("style"), ue = Symbol("text"), de = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), fe = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/errors.js
function pe() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function me(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function he(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function ge() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function _e(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function ve() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
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
var Ce = {}, w = Symbol("uninitialized"), we = "http://www.w3.org/1999/xhtml";
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
var T = !1;
function Oe(e) {
	T = e;
}
var E;
function D(e) {
	if (e === null) throw Ee(), Ce;
	return E = e;
}
function ke() {
	return D(/* @__PURE__ */ L(E));
}
function O(e) {
	if (T) {
		if (/* @__PURE__ */ L(E) !== null) throw Ee(), Ce;
		E = e;
	}
}
function Ae(e = 1) {
	if (T) {
		for (var t = e, n = E; t--;) n = /* @__PURE__ */ L(n);
		E = n;
	}
}
function je(e = !0) {
	for (var t = 0, n = E;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ L(n);
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
var k = null;
function Ie(e) {
	k = e;
}
function Le(e, t = !1, n) {
	k = {
		p: k,
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
	var t = k, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) rn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, k = t.p, e ?? {};
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
	if (Be.length === 0 && !_t) {
		var t = Be;
		queueMicrotask(() => {
			t === Be && Ve();
		});
	}
	Be.push(e);
}
function Ue(e) {
	var t = W;
	if (t === null) return V.f |= ie, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	We(e, t);
}
function We(e, t) {
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
var Ge = ~(h | g | m);
function A(e, t) {
	e.f = e.f & Ge | t;
}
function Ke(e) {
	e.f & 512 || e.deps === null ? A(e, m) : A(e, g);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/utils.js
function qe(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= C, qe(t.deps));
}
function Je(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), qe(e.deps), A(e, m);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function Ye(e) {
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
function Xe(e) {
	let t = 0, n = Mt(0), r;
	return () => {
		en() && (X(n), sn(() => (t === 0 && (r = zn(() => e(() => It(n)))), t += 1, () => {
			He(() => {
				--t, t === 0 && (r?.(), r = void 0, It(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var Ze = x | S;
function Qe(e, t, n, r) {
	new $e(e, t, n, r);
}
var $e = class {
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
	#h = Xe(() => (this.#m = Mt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = ln(() => {
			if (T) {
				let e = this.#t;
				ke();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, Ze), T && (this.#e = E);
	}
	#g() {
		try {
			this.#a = z(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		He(r), t && (this.#s = z(() => {
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
			t = !0, n && Se(), this.#s !== null && hn(this.#s, () => {
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
					We(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = z(() => e(this.#e)), He(() => {
			var e = this.#c = document.createDocumentFragment(), t = I();
			e.append(t), this.#a = this.#S(() => z(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, hn(this.#o, () => {
				this.#o = null;
			}), this.#x(j));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = z(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				yn(this.#a, e);
				let t = this.#n.pending;
				this.#o = z(() => t(this.#e));
			} else this.#x(j);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		Je(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = V, r = k;
		G(this.#i), U(this.#i), Ie(this.#i.ctx);
		try {
			return Ct.ensure(), e();
		} catch (e) {
			return Ue(e), null;
		} finally {
			G(t), U(n), Ie(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && hn(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, He(() => {
			this.#d = !1, this.#m && Pt(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), X(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		j?.is_fork ? (this.#a && j.skip_effect(this.#a), this.#o && j.skip_effect(this.#o), this.#s && j.skip_effect(this.#s), j.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (B(this.#a), null), this.#o &&= (B(this.#o), null), this.#s &&= (B(this.#s), null), T && (D(this.#t), Ae(), D(je()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return z(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return We(e, this.#i.parent), null;
				}
			}));
		};
		He(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				We(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => We(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/async.js
function et(e, t, n, r) {
	let i = ze() ? it : ct;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = tt(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				We(e, s);
			}
			nt();
		}
	}
	var d = rt();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ ot(e))).then(u).catch((e) => We(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), nt();
	}) : f();
}
function tt() {
	var e = W, t = V, n = k, r = j;
	return function(i = !0) {
		G(e), U(t), Ie(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function nt(e = !0) {
	G(null), U(null), Ie(null), e && j?.deactivate();
}
function rt() {
	var e = W, t = e.b, n = j, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function it(e) {
	var t = 2 | h;
	return W !== null && (W.f |= S), {
		ctx: k,
		deps: null,
		effects: null,
		equals: Ne,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: w,
		wv: 0,
		parent: W,
		ac: null
	};
}
var at = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function ot(e, t, n) {
	let r = W;
	r === null && pe();
	var i = void 0, a = Mt(w), o = !V, s = /* @__PURE__ */ new Set();
	return on(() => {
		var t = W, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== de && n.reject(e);
			}).finally(nt);
		} catch (e) {
			n.reject(e), nt();
		}
		var c = j;
		if (o) {
			if (t.f & 32768) var l = rt();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(at);
			else for (let e of s.values()) e.reject(at);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== at && (c.activate(), t ? (a.f |= ie, Pt(a, t)) : (a.f & 8388608 && (a.f ^= ie), Pt(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), tn(() => {
		for (let e of s) e.reject(at);
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
function st(e) {
	let t = /* @__PURE__ */ it(e);
	return wn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function ct(e) {
	let t = /* @__PURE__ */ it(e);
	return t.equals = Fe, t;
}
function lt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) B(t[n]);
	}
}
function ut(e) {
	var t, n = W, r = e.parent;
	if (!Sn && r !== null && e.v !== w && r.f & 24576) return Te(), e.v;
	G(r);
	try {
		e.f &= ~C, lt(e), t = Nn(e);
	} finally {
		G(n);
	}
	return t;
}
function dt(e) {
	var t = ut(e);
	if (!e.equals(t) && (e.wv = An(), (!j?.is_fork || e.deps === null) && (j === null ? e.v = t : (j.capture(e, t, !0), ht?.capture(e, t, !0)), e.deps === null))) {
		A(e, m);
		return;
	}
	Sn || (M === null ? Ke(e) : (en() || j?.is_fork) && M.set(e, t));
}
function ft(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && Ye(() => {
		t.ac.abort(de), t.ac = null;
	}), t.fn !== null && (t.teardown = d), Fn(t, 0), dn(t));
}
function pt(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && In(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/batch.js
var mt = null, j = null, ht = null, M = null, gt = null, _t = !1, vt = !1, yt = null, bt = null, xt = 0, St = 1, Ct = class e {
	id = St++;
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
		mt === null ? mt = this : (mt.#n = this, this.#t = mt), mt = this;
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
			for (var r of n.d) A(r, h), t(r);
			for (r of n.m) A(r, g), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		this.#e = !0, xt++ > 1e3 && (this.#x(), wt());
		for (let e of this.#u) this.#d.delete(e), A(e, h), this.schedule(e);
		for (let e of this.#d) A(e, g), this.schedule(e);
		let t = this.#c;
		this.#c = [], this.apply();
		var n = yt = [], r = [], i = bt = [];
		for (let e of t) try {
			this.#_(e, n, r);
		} catch (t) {
			throw Ot(e), this.#h() || this.discard(), t;
		}
		if (j = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (yt = null, bt = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) Dt(e, t);
			i.length > 0 && j.#g();
			return;
		}
		let o = this.#v();
		if (o) {
			this.#b(r), this.#b(n), o.#y(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), ht = this, Tt(r), Tt(n), ht = null, this.#s?.resolve();
		var s = j;
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
				a ? r.f ^= m : i & 4 ? t.push(r) : jn(r) && (i & 16 && this.#d.add(r), In(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), A(i, h), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#x(), j = this, this.#g();
	}
	#b(e) {
		for (var t = 0; t < e.length; t += 1) Je(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== w && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), M?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		j = this;
	}
	deactivate() {
		j = null, M = null;
	}
	flush() {
		try {
			vt = !0, j = this, this.#g();
		} finally {
			xt = 0, gt = null, yt = null, bt = null, vt = !1, j = null, M = null, At.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(at);
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
		if (j === null) {
			let t = j = new e();
			!vt && He(() => {
				t.#e || t.flush();
			});
		}
		return j;
	}
	apply() {
		M = null;
	}
	schedule(e) {
		if (gt = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		for (var t = e; t.parent !== null;) {
			t = t.parent;
			var n = t.f;
			if (yt !== null && t === W && (V === null || !(V.f & 2))) return;
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
			e === null || (e.#n = t), t === null ? mt = e : t.#t = e, this.linked = !1;
		}
	}
};
function wt() {
	try {
		ve();
	} catch (e) {
		We(e, gt);
	}
}
var N = null;
function Tt(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && jn(r) && (N = /* @__PURE__ */ new Set(), In(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && mn(r), N?.size > 0)) {
				At.clear();
				for (let e of N) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) N.has(n) && (N.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || In(n);
					}
				}
				N.clear();
			}
		}
		N = null;
	}
}
function Et(e) {
	j.schedule(e);
}
function Dt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), A(e, m);
		for (var n = e.first; n !== null;) Dt(n, t), n = n.next;
	}
}
function Ot(e) {
	A(e, m);
	for (var t = e.first; t !== null;) Ot(t), t = t.next;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/sources.js
var kt = /* @__PURE__ */ new Set(), At = /* @__PURE__ */ new Map(), jt = !1;
function Mt(e, t) {
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
function P(e, t) {
	let n = Mt(e, t);
	return wn(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function Nt(e, t = !1, n = !0) {
	let r = Mt(e);
	return t || (r.equals = Fe), r;
}
function F(e, t, n = !1) {
	return V !== null && (!H || V.f & 131072) && ze() && V.f & 4325394 && (K === null || !K.has(e)) && xe(), Pt(e, n ? Rt(t) : t, bt);
}
function Pt(e, t, n = null) {
	if (!e.equals(t)) {
		At.set(e, Sn ? t : e.v);
		var r = Ct.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && ut(t), M === null && Ke(t);
		}
		e.wv = An(), Lt(e, h, n), ze() && W !== null && W.f & 1024 && !(W.f & 96) && (Y === null ? Tn([e]) : Y.push(e)), !r.is_fork && kt.size > 0 && !jt && Ft();
	}
	return t;
}
function Ft() {
	jt = !1;
	for (let e of kt) {
		e.f & 1024 && A(e, g);
		let t;
		try {
			t = jn(e);
		} catch {
			t = !0;
		}
		t && In(e);
	}
	kt.clear();
}
function It(e) {
	F(e, e.v + 1);
}
function Lt(e, t, n) {
	var r = e.reactions;
	if (r !== null) for (var i = ze(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === W)) {
			var l = (c & h) === 0;
			if (l && A(s, t), c & 131072) kt.add(s);
			else if (c & 2) {
				var u = s;
				M?.delete(u), c & 65536 || (c & 512 && (W === null || !(W.f & 2097152)) && (s.f |= C), Lt(u, g, n));
			} else if (l) {
				var d = s;
				c & 16 && N !== null && N.add(d), n === null ? Et(d) : n.push(d);
			}
		}
	}
}
function Rt(t) {
	if (typeof t != "object" || !t || ae in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ P(0), u = null, d = On, f = (e) => {
		if (On === d) return e();
		var t = V, n = On;
		U(null), kn(d);
		var r = e();
		return U(t), kn(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ P(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && ye();
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
					r.set(t, e), It(o);
				}
			} else F(n, w), It(o);
			return !0;
		},
		get(e, n, i) {
			if (n === ae) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ P(Rt(s ? e[n] : w), u)), r.set(n, o)), o !== void 0) {
				var c = X(o);
				return c === w ? void 0 : c;
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
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ P(i ? Rt(e[t]) : w, u)), r.set(t, n)), X(n) === w) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ P(w, u)), r.set(d + "", p)) : F(p, w);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ P(void 0, u)), F(c, Rt(n)), r.set(t, c));
			else {
				l = c.v !== w;
				var m = f(() => Rt(n));
				F(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && F(g, _ + 1);
				}
				It(o);
			}
			return !0;
		},
		ownKeys(e) {
			X(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== w;
			});
			for (var [n, i] of r) i.v !== w && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			be();
		}
	});
}
var zt, Bt, Vt, Ht;
function Ut() {
	if (zt === void 0) {
		zt = window, Bt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		Vt = a(t, "firstChild").get, Ht = a(t, "nextSibling").get, u(e) && (e[ce] = void 0, e[se] = null, e[le] = void 0, e.__e = void 0), u(n) && (n[ue] = void 0);
	}
}
function I(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function Wt(e) {
	return Vt.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function L(e) {
	return Ht.call(e);
}
function R(e, t) {
	if (!T) return /* @__PURE__ */ Wt(e);
	var n = /* @__PURE__ */ Wt(E);
	if (n === null) n = E.appendChild(I());
	else if (t && n.nodeType !== 3) {
		var r = I();
		return n?.before(r), D(r), r;
	}
	return t && Xt(n), D(n), n;
}
function Gt(e, t = !1) {
	if (!T) {
		var n = /* @__PURE__ */ Wt(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ L(n) : n;
	}
	if (t) {
		if (E?.nodeType !== 3) {
			var r = I();
			return E?.before(r), D(r), r;
		}
		Xt(E);
	}
	return E;
}
function Kt(e, t = 1, n = !1) {
	let r = T ? E : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ L(r);
	if (!T) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = I();
			return r === null ? i?.after(a) : r.before(a), D(a), a;
		}
		Xt(r);
	}
	return D(r), r;
}
function qt(e) {
	e.textContent = "";
}
function Jt() {
	return !1;
}
function Yt(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function Xt(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/effects.js
function Zt(e) {
	W === null && (V === null && _e(e), ge()), Sn && he(e);
}
function Qt(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function $t(e, t) {
	var n = W;
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
	j?.register_created_effect(r);
	var i = r;
	if (e & 4) yt === null ? Ct.ensure().schedule(r) : yt.push(r);
	else if (t !== null) {
		try {
			In(r);
		} catch (e) {
			throw B(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= x));
	}
	if (i !== null && (i.parent = n, n !== null && Qt(i, n), V !== null && V.f & 2 && !(e & 64))) {
		var a = V;
		(a.effects ??= []).push(i);
	}
	return r;
}
function en() {
	return V !== null && !H;
}
function tn(e) {
	let t = $t(8, null);
	return A(t, m), t.teardown = e, t;
}
function nn(e) {
	Zt("$effect");
	var t = W.f;
	if (!V && t & 32 && k !== null && !k.i) {
		var n = k;
		(n.e ??= []).push(e);
	} else return rn(e);
}
function rn(e) {
	return $t(4 | ee, e);
}
function an(e) {
	Ct.ensure();
	let t = $t(64 | S, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? hn(t, () => {
			B(t), n(void 0);
		}) : (B(t), n(void 0));
	});
}
function on(e) {
	return $t(re | S, e);
}
function sn(e, t = 0) {
	return $t(8 | t, e);
}
function cn(e, t = [], n = [], r = []) {
	et(r, t, n, (t) => {
		$t(8, () => {
			e(...t.map(X));
		});
	});
}
function ln(e, t = 0) {
	return $t(16 | t, e);
}
function z(e) {
	return $t(32 | S, e);
}
function un(e) {
	var t = e.teardown;
	if (t !== null) {
		let e = Sn, n = V;
		Cn(!0), U(null);
		try {
			t.call(null);
		} finally {
			Cn(e), U(n);
		}
	}
}
function dn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && Ye(() => {
			e.abort(de);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : B(n, t), n = r;
	}
}
function fn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || B(t), t = n;
	}
}
function B(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (pn(e.nodes.start, e.nodes.end), n = !0), e.f |= b, dn(e, t && !n), Fn(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	un(e), e.f ^= b, e.f |= v;
	var i = e.parent;
	i !== null && i.first !== null && mn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function pn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ L(e);
		e.remove(), e = n;
	}
}
function mn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function hn(e, t, n = !0) {
	var r = [];
	gn(e, r, !0);
	var i = () => {
		n && B(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function gn(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= _;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				gn(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function _n(e) {
	vn(e, !0);
}
function vn(e, t) {
	if (e.f & 8192) {
		e.f ^= _, e.f & 1024 || (A(e, h), Ct.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			vn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function yn(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ L(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/legacy.js
var bn = null, xn = !1, Sn = !1;
function Cn(e) {
	Sn = e;
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
function wn(e) {
	V !== null && (K ??= /* @__PURE__ */ new Set()).add(e);
}
var q = null, J = 0, Y = null;
function Tn(e) {
	Y = e;
}
var En = 1, Dn = 0, On = Dn;
function kn(e) {
	On = e;
}
function An() {
	return ++En;
}
function jn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 2 && (e.f &= ~C), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (jn(a) && dt(a), a.wv > e.wv) return !0;
		}
		t & 512 && M === null && A(e, m);
	}
	return !1;
}
function Mn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(K !== null && K.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Mn(a, t, !1) : t === a && (n ? A(a, h) : a.f & 1024 && A(a, g), Et(a));
	}
}
function Nn(e) {
	var t = q, n = J, r = Y, i = V, a = K, o = k, s = H, c = On, l = e.f;
	q = null, J = 0, Y = null, V = l & 96 ? null : e, K = null, Ie(e.ctx), H = !1, On = ++Dn, e.ac !== null && (Ye(() => {
		e.ac.abort(de);
	}), e.ac = null);
	try {
		e.f |= ne;
		var u = e.fn, d = u();
		e.f |= y;
		var f = e.deps, p = j?.is_fork;
		if (q !== null) {
			var m;
			if (p || Fn(e, J), f !== null && J > 0) for (f.length = J + q.length, m = 0; m < q.length; m++) f[J + m] = q[m];
			else e.deps = f = q;
			if (en() && e.f & 512) for (m = J; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && J < f.length && (Fn(e, J), f.length = J);
		if (ze() && Y !== null && !H && f !== null && !(e.f & 6146)) for (m = 0; m < Y.length; m++) Mn(Y[m], e);
		if (i !== null && i !== e) {
			if (Dn++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = Dn;
			if (t !== null) for (let e of t) e.rv = Dn;
			Y !== null && (r === null ? r = Y : r.push(...Y));
		}
		return e.f & 8388608 && (e.f ^= ie), d;
	} catch (e) {
		return Ue(e);
	} finally {
		e.f ^= ne, q = t, J = n, Y = r, V = i, K = a, Ie(o), H = s, On = c;
	}
}
function Pn(e, r) {
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
		s.f & 512 && (s.f ^= 512, s.f &= ~C), s.v !== w && Ke(s), s.ac !== null && Ye(() => {
			s.ac.abort(de), s.ac = null, A(s, h);
		}), ft(s), Fn(s, 0);
	}
}
function Fn(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) Pn(e, n[r]);
}
function In(e) {
	var t = e.f;
	if (!(t & 16384)) {
		A(e, m);
		var n = W, r = xn;
		W = e, xn = !(t & 96);
		try {
			t & 16777232 ? fn(e) : dn(e), un(e);
			var i = Nn(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = En;
		} finally {
			xn = r, W = n;
		}
	}
}
function X(e) {
	var t = !!(e.f & 2);
	if (bn?.add(e), V !== null && !H && !(W !== null && W.f & 16384) && (K === null || !K.has(e))) {
		var r = V.deps;
		if (V.f & 2097152) e.rv < Dn && (e.rv = Dn, q === null && r !== null && r[J] === e ? J++ : q === null ? q = [e] : q.push(e));
		else {
			V.deps ??= [], n.call(V.deps, e) || V.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [V] : n.call(i, V) || i.push(V);
		}
	}
	if (Sn && At.has(e)) return At.get(e);
	if (t) {
		var a = e;
		if (Sn) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || Rn(a)) && (o = ut(a)), At.set(a, o), o;
		}
		var s = !(a.f & 512) && !H && V !== null && (xn || !!(V.f & 512)), c = (a.f & y) === 0;
		jn(a) && (s && (a.f |= 512), dt(a)), s && !c && (pt(a), Ln(a));
	}
	if (M?.has(e)) return M.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function Ln(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (pt(t), Ln(t));
}
function Rn(e) {
	if (e.v === w) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (At.has(t) || t.f & 2 && Rn(t)) return !0;
	return !1;
}
function zn(e) {
	var t = H;
	try {
		return H = !0, e();
	} finally {
		H = t;
	}
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var Bn = ["touchstart", "touchmove"];
function Vn(e) {
	return Bn.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/events.js
var Hn = Symbol("events"), Un = /* @__PURE__ */ new Set(), Wn = /* @__PURE__ */ new Set();
function Gn(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || Xn.call(t, e), !e.cancelBubble) return Ye(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? He(() => {
		t.addEventListener(e, i, r);
	}) : t.addEventListener(e, i, r), i;
}
function Kn(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = Gn(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && tn(() => {
		t.removeEventListener(e, o, a);
	});
}
function qn(e, t, n) {
	(t[Hn] ??= {})[e] = n;
}
function Jn(e) {
	for (var t = 0; t < e.length; t++) Un.add(e[t]);
	for (var n of Wn) n(e);
}
var Yn = null;
function Xn(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	Yn = e;
	var s = 0, c = Yn === e && e[Hn];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[Hn] = t;
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
					var h = o[Hn]?.[r];
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
			e[Hn] = t, delete e.currentTarget, U(d), G(f);
		}
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/reconciler.js
var Zn = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function Qn(e) {
	return Zn?.createHTML(e) ?? e;
}
function $n(e) {
	var t = Yt("template");
	return t.innerHTML = Qn(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/template.js
function er(e, t) {
	var n = W;
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
		if (T) return er(E, null), E;
		i === void 0 && (i = $n(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ Wt(i)));
		var t = r || Bt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ Wt(t), s = t.lastChild;
			er(o, s);
		} else er(t, t);
		return t;
	};
}
function tr() {
	if (T) return er(E, null), E;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = I();
	return e.append(t, n), er(t, n), e;
}
function Q(e, t) {
	if (T) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = E), ke();
		return;
	}
	e !== null && e.before(t);
}
function nr(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[ue] ??= e.nodeValue) && (e[ue] = n, e.nodeValue = `${n}`);
}
function rr(e, t) {
	return ar(e, t);
}
var ir = /* @__PURE__ */ new Map();
function ar(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	Ut();
	var l = void 0, u = an(() => {
		var s = n ?? t.appendChild(I());
		Qe(s, { pending: () => {} }, (t) => {
			Le({});
			var n = k;
			if (o && (n.c = o), a && (i.$$events = a), T && er(t, null), l = e(t, i) || {}, T && (W.nodes.end = E, E === null || E.nodeType !== 8 || E.data !== "]")) throw Ee(), Ce;
			Re();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = Vn(r);
					for (let e of [t, document]) {
						var a = ir.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), ir.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, Xn, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(Un)), Wn.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = ir.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, Xn), r.delete(e), r.size === 0 && ir.delete(n)) : r.set(e, i);
			}
			Wn.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return or.set(l, u), l;
}
var or = /* @__PURE__ */ new WeakMap();
function sr(e, t) {
	let n = or.get(e);
	return n ? (or.delete(e), n(t)) : Promise.resolve();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var cr = class {
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
			if (n) _n(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (_n(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
			}
			for (let [t, n] of this.#e) {
				if (this.#e.delete(t), t === e) break;
				let r = this.#n.get(n);
				r && (B(r.effect), this.#n.delete(n));
			}
			for (let [e, r] of this.#t) {
				if (e === t || this.#r.has(e)) continue;
				let i = () => {
					if (Array.from(this.#e.values()).includes(e)) {
						var t = document.createDocumentFragment();
						yn(r, t), t.append(I()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else B(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), hn(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (B(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = j, r = Jt();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = I();
				i.append(a), this.#n.set(e, {
					effect: z(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, z(() => t(this.anchor)));
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
function lr(e, t, n = !1) {
	var r;
	T && (r = E, ke());
	var i = new cr(e), a = n ? x : 0;
	function o(e, t) {
		if (T) {
			var n = Me(r);
			if (e !== parseInt(n.substring(1))) {
				var a = je();
				D(a), i.anchor = a, Oe(!1), i.ensure(e, t), Oe(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	ln(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/each.js
function ur(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		hn(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					dr(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = i.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			qt(d), d.append(u), e.items.clear();
		}
		dr(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function dr(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= te, yn(a, document.createDocumentFragment())) : B(t[i], n);
	}
}
var fr;
function pr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = T ? D(/* @__PURE__ */ Wt(u)) : u.appendChild(I());
	}
	T && ke();
	var d = null, f = /* @__PURE__ */ ct(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, hr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= te, _r(d, null, c)) : _n(d) : hn(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: ln(() => {
			p = X(f);
			var e = p.length;
			let t = !1;
			T && Me(c) === "[!" != (e === 0) && (c = je(), D(c), Oe(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = j, v = Jt(), y = 0; y < e; y += 1) {
				T && E.nodeType === 8 && E.data === "]" && (c = E, t = !0, Oe(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Pt(S.v, b), S.i && Pt(S.i, y), v && u.unskip_effect(S.e)) : (S = gr(l, h ? c : fr ??= I(), b, x, y, o, n, i), h || (S.e.f |= te), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = z(() => s(c)) : (d = z(() => s(fr ??= I())), d.f |= te)), e > r.size && me("", "", ""), T && e > 0 && D(je()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && Oe(!0), X(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, T && (c = E);
}
function mr(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function hr(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = mr(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (_n(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= te, _ === l) _r(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), vr(e, d, _), vr(e, _, y), _r(_, y, n), d = _, p = [], m = [], l = mr(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], ee = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) _r(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					vr(e, S.prev, ee.next), vr(e, d, S), vr(e, ee, b), l = b, d = ee, --v, p = [], m = [];
				} else u.delete(_), _r(_, l, n), vr(e, _.prev, _.next), vr(e, _, d === null ? e.effect.first : d.next), vr(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = mr(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = mr(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (dr(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var C = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || C.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && C.push(l), l = mr(l.next);
		var ne = C.length;
		if (ne > 0) {
			var re = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < ne; v += 1) C[v].nodes?.a?.measure();
				for (v = 0; v < ne; v += 1) C[v].nodes?.a?.fix();
			}
			ur(e, C, re);
		}
	}
	o && He(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function gr(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Mt(n) : /* @__PURE__ */ Nt(n, !1, !1) : null, l = o & 2 ? Mt(i) : null;
	return {
		v: c,
		i: l,
		e: z(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function _r(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ L(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function vr(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
//#endregion
//#region ../../node_modules/.bun/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function yr(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = yr(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function br() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = yr(e)) && (r && (r += " "), r += t);
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/attributes.js
function xr(e) {
	return typeof e == "object" ? br(e) : e ?? "";
}
var Sr = [..." 	\n\r\f\xA0\v﻿"];
function Cr(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || Sr.includes(r[o - 1])) && (s === r.length || Sr.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
function wr(e, t = !1) {
	var n = t ? " !important;" : ";", r = "";
	for (var i of Object.keys(e)) {
		var a = e[i];
		a != null && a !== "" && (r += " " + i + ": " + a + n);
	}
	return r;
}
function Tr(e) {
	return e[0] !== "-" || e[1] !== "-" ? e.toLowerCase() : e;
}
function Er(e, t) {
	if (t) {
		var n = "", r, i;
		if (Array.isArray(t) ? (r = t[0], i = t[1]) : r = t, e) {
			e = String(e).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
			var a = !1, o = 0, s = !1, c = [];
			r && c.push(...Object.keys(r).map(Tr)), i && c.push(...Object.keys(i).map(Tr));
			var l = 0, u = -1;
			let t = e.length;
			for (var d = 0; d < t; d++) {
				var f = e[d];
				if (s ? f === "/" && e[d - 1] === "*" && (s = !1) : a ? a === f && (a = !1) : f === "/" && e[d + 1] === "*" ? s = !0 : f === "\"" || f === "'" ? a = f : f === "(" ? o++ : f === ")" && o--, !s && a === !1 && o === 0) {
					if (f === ":" && u === -1) u = d;
					else if (f === ";" || d === t - 1) {
						if (u !== -1) {
							var p = Tr(e.substring(l, u).trim());
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
		return r && (n += wr(r)), i && (n += wr(i, !0)), n = n.trim(), n === "" ? null : n;
	}
	return e == null ? null : String(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/class.js
function Dr(e, t, n, r, i, a) {
	var o = e[ce];
	if (T || o !== n || o === void 0) {
		var s = Cr(n, r, a);
		(!T || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[ce] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/style.js
function Or(e, t = {}, n, r) {
	for (var i in n) {
		var a = n[i];
		t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
	}
}
function kr(e, t, n, r) {
	var i = e[le];
	if (T || i !== t) {
		var a = Er(t, r);
		(!T || a !== e.getAttribute("style")) && (a == null ? e.removeAttribute("style") : e.style.cssText = a), e[le] = t;
	} else r && (Array.isArray(r) ? (Or(e, n?.[0], r[0]), Or(e, n?.[1], r[1], "important")) : Or(e, n, r));
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var Ar = Symbol("is custom element"), jr = Symbol("is html"), Mr = fe ? "link" : "LINK";
function Nr(e, t, n, r) {
	var i = Pr(e);
	T && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Mr) || i[t] !== (i[t] = n) && (t === "loading" && (e[oe] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && Ir(e).includes(t) ? e[t] = n : e.setAttribute(t, n));
}
function Pr(e) {
	return e[se] ??= {
		[Ar]: e.nodeName.includes("-"),
		[jr]: e.namespaceURI === we
	};
}
var Fr = /* @__PURE__ */ new Map();
function Ir(e) {
	var t = e.getAttribute("is") || e.nodeName, n = Fr.get(t);
	if (n) return n;
	Fr.set(t, n = []);
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.push(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region systray/src/lib.ts
function Lr(e) {
	return typeof e != "object" || !e ? {} : e;
}
function $(e) {
	return typeof e == "string" ? e : "";
}
function Rr(e) {
	return Array.isArray(e) ? e.flatMap(zr) : [];
}
function zr(e) {
	let t = Lr(e);
	return typeof t.key != "string" || t.key === "" ? [] : [{
		key: t.key,
		id: $(t.id),
		title: $(t.title),
		status: $(t.status),
		icon: $(t.icon),
		iconData: $(t.iconData),
		tooltip: $(t.tooltip),
		itemIsMenu: t.itemIsMenu === !0,
		hasActivate: t.hasActivate === !0,
		menuPath: $(t.menuPath)
	}];
}
function Br(e) {
	return Array.isArray(e) ? e.flatMap(Vr) : [];
}
function Vr(e) {
	let t = Lr(e);
	return typeof t.id == "number" ? [{
		id: t.id,
		label: $(t.label),
		enabled: t.enabled !== !1,
		separator: t.separator === !0,
		toggleType: $(t.toggleType),
		toggleState: Hr(t.toggleState, -1),
		icon: $(t.icon),
		iconData: $(t.iconData),
		children: Br(t.children)
	}] : [];
}
function Hr(e, t) {
	return typeof e == "number" ? e : t;
}
function Ur(e, t) {
	return e.iconData === "" ? e.icon === "" ? "" : `/appicon/${encodeURIComponent(e.icon)}?size=${t}` : e.iconData;
}
function Wr(e) {
	let t = qr(e.title, e.id);
	return t === "" ? "?" : t.slice(0, 1).toUpperCase();
}
function Gr(e, t) {
	return e.iconData === "" ? e.icon === "" ? "" : `/appicon/${encodeURIComponent(e.icon)}?size=${t}` : e.iconData;
}
function Kr(e) {
	return qr(e.tooltip, qr(e.title, e.id));
}
function qr(e, t) {
	return e === "" ? t : e;
}
function Jr(e, t) {
	let n = e.get(t);
	if (n === void 0) throw Error(`views: service "${t}" is not available`);
	return n;
}
//#endregion
//#region systray/src/Systray.svelte
var Yr = /* @__PURE__ */ Z("<img class=\"h-4 w-4 object-contain\"/>"), Xr = /* @__PURE__ */ Z("<span class=\"text-[10px] font-semibold text-base-content/70\"> </span>"), Zr = /* @__PURE__ */ Z("<button><!></button>"), Qr = /* @__PURE__ */ Z("<div class=\"flex items-center gap-1\"></div>");
function $r(e, t) {
	Le(t, !0);
	let n = /* @__PURE__ */ P(Rt([]));
	nn(() => t.bus.subscribe("systray.items", (e) => {
		F(n, Rr(e.data), !0);
	}));
	function r(e, n, r) {
		t.bus.publish(e, {
			key: n.key,
			x: Math.round(r.clientX),
			y: Math.round(r.clientY)
		});
	}
	function i(e, n) {
		let r = n.currentTarget.getBoundingClientRect();
		t.bus.publish("systray:menu-open", {
			key: e.key,
			x: Math.round(r.left),
			y: Math.round(r.bottom + 4)
		});
	}
	function a(e, t) {
		if (e.hasActivate && !e.itemIsMenu) {
			r("systray:activate", e, t);
			return;
		}
		s(e, t);
	}
	function o(e, t) {
		t.preventDefault(), s(e, t);
	}
	function s(e, t) {
		if (e.menuPath !== "") {
			i(e, t);
			return;
		}
		r("systray:context", e, t);
	}
	function c(e, t) {
		t.button === 1 && r("systray:secondary", e, t);
	}
	function l(e, n) {
		n.preventDefault(), t.bus.publish("systray:scroll", {
			key: e.key,
			delta: Math.round(n.deltaY),
			orientation: "vertical"
		});
	}
	let u = "flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors duration-150 hover:bg-base-content/10 ";
	function d(e) {
		return e.status === "NeedsAttention" ? u + "animate-pulse" : e.status === "Passive" ? u + "opacity-50" : u;
	}
	var f = tr(), p = Gt(f), m = (e) => {
		var t = Qr();
		pr(t, 21, () => X(n), (e) => e.key, (e, t) => {
			var n = Zr(), r = R(n), i = (e) => {
				var n = Yr();
				cn((e, t) => {
					Nr(n, "src", e), Nr(n, "alt", t);
				}, [() => Gr(X(t), 32), () => Kr(X(t))]), Q(e, n);
			}, s = /* @__PURE__ */ st(() => Gr(X(t), 32) !== ""), u = (e) => {
				var n = Xr(), r = R(n, !0);
				O(n), cn((e) => nr(r, e), [() => Wr(X(t))]), Q(e, n);
			};
			lr(r, (e) => {
				X(s) ? e(i) : e(u, -1);
			}), O(n), cn((e, t) => {
				Dr(n, 1, e), Nr(n, "title", t);
			}, [() => xr(d(X(t))), () => Kr(X(t))]), qn("click", n, (e) => a(X(t), e)), qn("contextmenu", n, (e) => o(X(t), e)), Kn("auxclick", n, (e) => c(X(t), e)), Kn("wheel", n, (e) => l(X(t), e)), Q(e, n);
		}), O(t), Q(e, t);
	};
	lr(p, (e) => {
		X(n).length > 0 && e(m);
	}), Q(e, f), Re();
}
Jn(["click", "contextmenu"]);
//#endregion
//#region systray/src/MenuList.svelte
var ei = /* @__PURE__ */ Z("<div class=\"my-1 h-px bg-base-content/10\"></div>"), ti = /* @__PURE__ */ Z("<span class=\"w-3 shrink-0 text-center text-[11px]\"> </span>"), ni = /* @__PURE__ */ Z("<img class=\"h-4 w-4 shrink-0 object-contain\" alt=\"\"/>"), ri = /* @__PURE__ */ Z("<span class=\"shrink-0 text-[10px] text-base-content/50\">›</span>"), ii = /* @__PURE__ */ Z("<div class=\"absolute top-0 left-full pl-1\"><!></div>"), ai = /* @__PURE__ */ Z("<div class=\"relative\" role=\"none\"><button><!> <!> <span class=\"flex-1 truncate\"> </span> <!></button> <!></div>"), oi = /* @__PURE__ */ Z("<div class=\"flex min-w-52 flex-col gap-px rounded-xl border border-base-content/10 bg-base-200 p-1\n    text-base-content shadow-2xl shadow-black/60\"></div>");
function si(e, t) {
	Le(t, !0);
	let n = /* @__PURE__ */ P(-1);
	function r(e) {
		if (e.children.length === 0) {
			F(n, -1);
			return;
		}
		F(n, e.id, !0);
	}
	function i(e) {
		!e.enabled || e.children.length > 0 || t.onActivate(e);
	}
	let a = "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[12.5px] leading-5 ";
	function o(e) {
		return e.enabled ? a + "cursor-pointer text-base-content hover:bg-base-content/10" : a + "cursor-default text-base-content/35";
	}
	let s = /* @__PURE__ */ st(() => t.entries.some((e) => e.toggleType !== ""));
	function c(e) {
		return e.toggleState === 1 ? e.toggleType === "radio" ? "•" : "✓" : "";
	}
	var l = oi();
	pr(l, 21, () => t.entries, (e) => e.id, (e, a) => {
		var l = tr(), u = Gt(l), d = (e) => {
			Q(e, ei());
		}, f = (e) => {
			var l = ai(), u = R(l), d = R(u), f = (e) => {
				var t = ti(), n = R(t, !0);
				O(t), cn((e) => nr(n, e), [() => c(X(a))]), Q(e, t);
			};
			lr(d, (e) => {
				X(s) && e(f);
			});
			var p = Kt(d, 2), m = (e) => {
				var t = ni();
				cn((e) => Nr(t, "src", e), [() => Ur(X(a), 32)]), Q(e, t);
			}, h = /* @__PURE__ */ st(() => Ur(X(a), 32) !== "");
			lr(p, (e) => {
				X(h) && e(m);
			});
			var g = Kt(p, 2), _ = R(g, !0);
			O(g);
			var v = Kt(g, 2), y = (e) => {
				Q(e, ri());
			};
			lr(v, (e) => {
				X(a).children.length > 0 && e(y);
			}), O(u);
			var b = Kt(u, 2), x = (e) => {
				var n = ii();
				si(R(n), {
					get entries() {
						return X(a).children;
					},
					get onActivate() {
						return t.onActivate;
					}
				}), O(n), Q(e, n);
			};
			lr(b, (e) => {
				X(a).children.length > 0 && X(n) === X(a).id && e(x);
			}), O(l), cn((e) => {
				Dr(u, 1, e), u.disabled = !X(a).enabled, nr(_, X(a).label);
			}, [() => xr(o(X(a)))]), Kn("mouseenter", l, () => r(X(a))), qn("click", u, () => i(X(a))), Q(e, l);
		};
		lr(u, (e) => {
			X(a).separator ? e(d) : e(f, -1);
		}), Q(e, l);
	}), O(l), Q(e, l), Re();
}
Jn(["click"]);
//#endregion
//#region systray/src/Menu.svelte
var ci = /* @__PURE__ */ Z("<div class=\"rounded-xl border border-base-content/10 bg-base-200 px-3 py-2 text-[12px]\n            text-base-content/60 shadow-2xl shadow-black/60\">No menu</div>"), li = /* @__PURE__ */ Z("<div class=\"fixed inset-0\" data-input-region=\"\"><button type=\"button\" class=\"absolute inset-0 cursor-default\" aria-label=\"Close tray menu\"></button> <div class=\"absolute\"><!></div></div>"), ui = /* @__PURE__ */ Z("<div class=\"pointer-events-none fixed top-0 left-0 h-0 w-0\" data-input-region=\"\" aria-hidden=\"true\"></div>");
function di(e, t) {
	Le(t, !0);
	let n = /* @__PURE__ */ P(!1), r = /* @__PURE__ */ P(Rt([])), i = /* @__PURE__ */ P(!1), a = /* @__PURE__ */ P(""), o = /* @__PURE__ */ P(0), s = /* @__PURE__ */ P(0);
	nn(() => {
		let e = [t.bus.subscribe("systray:menu-open", (e) => {
			c(e.data);
		}), t.bus.subscribe("systray:menu-close", () => u())];
		return () => {
			for (let t of e) t();
		};
	});
	async function c(e) {
		let t = Lr(e);
		typeof t.key == "string" && (F(a, t.key, !0), F(o, p(t.x), !0), F(s, p(t.y), !0), F(r, [], !0), F(i, !1), F(n, !0), await l(t.key));
	}
	async function l(e) {
		let o = Lr(await t.bus.call("systray:menu", { key: e }));
		e !== X(a) || !X(n) || (F(r, Br(o.entries), !0), F(i, X(r).length === 0));
	}
	function u() {
		F(n, !1), F(r, [], !0), F(a, "");
	}
	function d(e) {
		t.bus.publish("systray:menuevent", {
			key: X(a),
			id: e.id
		}), u();
	}
	function f(e) {
		e.key === "Escape" && X(n) && u();
	}
	function p(e) {
		return typeof e == "number" ? e : 0;
	}
	let m = /* @__PURE__ */ st(() => Math.max(8, Math.min(X(o), window.innerWidth - 240 - 8)));
	var h = tr();
	Kn("keydown", zt, f);
	var g = Gt(h), _ = (e) => {
		var t = li(), n = R(t), a = Kt(n, 2);
		let o;
		var c = R(a), l = (e) => {
			Q(e, ci());
		}, f = (e) => {
			si(e, {
				get entries() {
					return X(r);
				},
				onActivate: d
			});
		};
		lr(c, (e) => {
			X(i) ? e(l) : X(r).length > 0 && e(f, 1);
		}), O(a), O(t), cn(() => o = kr(a, "", o, {
			top: `${X(s) ?? ""}px`,
			left: `${X(m) ?? ""}px`
		})), qn("click", n, u), qn("contextmenu", n, (e) => {
			e.preventDefault(), u();
		}), Q(e, t);
	}, v = (e) => {
		Q(e, ui());
	};
	lr(g, (e) => {
		X(n) ? e(_) : e(v, -1);
	}), Q(e, h), Re();
}
Jn(["click", "contextmenu"]);
//#endregion
//#region systray/src/views.ts
var fi = {
	name: "systray-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = Jr(e, "ui"), n = Jr(e, "bus");
		e.effect(() => gi()), e.effect(() => t.register("systray.indicator", pi(n))), e.effect(() => t.register("systray.menu", mi(n)));
	}
};
function pi(e) {
	return (t) => {
		let n = rr($r, {
			target: t,
			props: { bus: e }
		});
		return { dispose() {
			sr(n);
		} };
	};
}
function mi(e) {
	return (t) => {
		let n = rr(di, {
			target: t,
			props: { bus: e }
		});
		return { dispose() {
			sr(n);
		} };
	};
}
function hi(e) {
	let t = e.indexOf("?");
	return t < 0 ? "" : e.slice(t);
}
function gi() {
	if (_i()) return () => {};
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = `/plugins/systray/views.css${hi(import.meta.url)}`, document.head.appendChild(e), () => {
		e.remove();
	};
}
function _i() {
	return new URL(import.meta.url).origin !== window.location.origin;
}
//#endregion
export { fi as default };
