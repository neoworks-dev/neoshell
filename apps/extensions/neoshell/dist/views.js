//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/shared/utils.js
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
var m = 1024, h = 2048, g = 4096, _ = 8192, v = 16384, y = 32768, ee = 1 << 25, b = 65536, x = 1 << 19, te = 1 << 20, ne = 1 << 25, S = 65536, re = 1 << 21, ie = 1 << 22, ae = 1 << 23, oe = Symbol("$state"), se = Symbol(""), ce = Symbol("attributes"), le = Symbol("class"), ue = Symbol("style"), de = Symbol("text"), fe = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), pe = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/errors.js
function me() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function he(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function ge(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function _e() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function ve(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function ye() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function be() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function xe() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function Se() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Ce() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/constants.js
var we = {}, C = Symbol("uninitialized"), Te = "http://www.w3.org/1999/xhtml";
function Ee() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function De(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function Oe() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/hydration.js
var w = !1;
function ke(e) {
	w = e;
}
var T;
function E(e) {
	if (e === null) throw De(), we;
	return T = e;
}
function Ae() {
	return E(/* @__PURE__ */ Gt(T));
}
function D(e) {
	if (w) {
		if (/* @__PURE__ */ Gt(T) !== null) throw De(), we;
		T = e;
	}
}
function je(e = 1) {
	if (w) {
		for (var t = e, n = T; t--;) n = /* @__PURE__ */ Gt(n);
		T = n;
	}
}
function Me(e = !0) {
	for (var t = 0, n = T;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ Gt(n);
		e && n.remove(), n = i;
	}
}
function Ne(e) {
	if (!e || e.nodeType !== 8) throw De(), we;
	return e.data;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/reactivity/equality.js
function Pe(e) {
	return e === this.v;
}
function Fe(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function Ie(e) {
	return !Fe(e, this.v);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/context.js
var O = null;
function Le(e) {
	O = e;
}
function Re(e, t = !1, n) {
	O = {
		p: O,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: W,
		l: null
	};
}
function ze(e) {
	var t = O, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) rn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, O = t.p, e ?? {};
}
function Be() {
	return !0;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/task.js
var Ve = [];
function He() {
	var e = Ve;
	Ve = [], f(e);
}
function k(e) {
	if (Ve.length === 0 && !_t) {
		var t = Ve;
		queueMicrotask(() => {
			t === Ve && He();
		});
	}
	Ve.push(e);
}
function Ue(e) {
	var t = W;
	if (t === null) return V.f |= ae, e;
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
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/reactivity/status.js
var Ge = ~(h | g | m);
function A(e, t) {
	e.f = e.f & Ge | t;
}
function Ke(e) {
	e.f & 512 || e.deps === null ? A(e, m) : A(e, g);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/reactivity/utils.js
function qe(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= S, qe(t.deps));
}
function Je(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), qe(e.deps), A(e, m);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
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
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/reactivity/create-subscriber.js
function Xe(e) {
	let t = 0, n = Nt(0), r;
	return () => {
		en() && (X(n), cn(() => (t === 0 && (r = Bn(() => e(() => Lt(n)))), t += 1, () => {
			k(() => {
				--t, t === 0 && (r?.(), r = void 0, Lt(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var Ze = b | x;
function Qe(e, t, n, r) {
	new $e(e, t, n, r);
}
var $e = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = w ? T : null;
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
	#h = Xe(() => (this.#m = Nt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = un(() => {
			if (w) {
				let e = this.#t;
				Ae();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, Ze), w && (this.#e = T);
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
		k(r), t && (this.#s = z(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				Oe();
				return;
			}
			t = !0, n && Ce(), this.#s !== null && gn(this.#s, () => {
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
		e && (this.is_pending = !0, this.#o = z(() => e(this.#e)), k(() => {
			var e = this.#c = document.createDocumentFragment(), t = F();
			e.append(t), this.#a = this.#S(() => z(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, gn(this.#o, () => {
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
				bn(this.#a, e);
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
		var t = W, n = V, r = O;
		G(this.#i), U(this.#i), Le(this.#i.ctx);
		try {
			return Ct.ensure(), e();
		} catch (e) {
			return Ue(e), null;
		} finally {
			G(t), U(n), Le(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && gn(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, k(() => {
			this.#d = !1, this.#m && Ft(this.#m, this.#l);
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
		this.#a &&= (B(this.#a), null), this.#o &&= (B(this.#o), null), this.#s &&= (B(this.#s), null), w && (E(this.#t), je(), E(Me()));
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
		k(() => {
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
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/reactivity/async.js
function et(e, t, n, r) {
	let i = Be() ? it : ct;
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
	var e = W, t = V, n = O, r = j;
	return function(i = !0) {
		G(e), U(t), Le(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function nt(e = !0) {
	G(null), U(null), Le(null), e && j?.deactivate();
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
	return W !== null && (W.f |= x), {
		ctx: O,
		deps: null,
		effects: null,
		equals: Pe,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: C,
		wv: 0,
		parent: W,
		ac: null
	};
}
var at = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function ot(e, t, n) {
	let r = W;
	r === null && me();
	var i = void 0, a = Nt(C), o = !V, s = /* @__PURE__ */ new Set();
	return sn(() => {
		var t = W, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== fe && n.reject(e);
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
			l?.(), s.delete(n), t !== at && (c.activate(), t ? (a.f |= ae, Ft(a, t)) : (a.f & 8388608 && (a.f ^= ae), Ft(a, e)), c.deactivate());
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
	return Tn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function ct(e) {
	let t = /* @__PURE__ */ it(e);
	return t.equals = Ie, t;
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
	if (!Cn && r !== null && e.v !== C && r.f & 24576) return Ee(), e.v;
	G(r);
	try {
		e.f &= ~S, lt(e), t = Pn(e);
	} finally {
		G(n);
	}
	return t;
}
function dt(e) {
	var t = ut(e);
	if (!e.equals(t) && (e.wv = jn(), (!j?.is_fork || e.deps === null) && (j === null ? e.v = t : (j.capture(e, t, !0), ht?.capture(e, t, !0)), e.deps === null))) {
		A(e, m);
		return;
	}
	Cn || (M === null ? Ke(e) : (en() || j?.is_fork) && M.set(e, t));
}
function ft(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && Ye(() => {
		t.ac.abort(fe), t.ac = null;
	}), t.fn !== null && (t.teardown = d), In(t, 0), fn(t));
}
function pt(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && Ln(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/reactivity/batch.js
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
			throw kt(e), this.#h() || this.discard(), t;
		}
		if (j = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (yt = null, bt = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) Ot(e, t);
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
		this.#r.clear(), ht = this, Et(r), Et(n), ht = null, this.#s?.resolve();
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
				a ? r.f ^= m : i & 4 ? t.push(r) : Mn(r) && (i & 16 && this.#d.add(r), Ln(r));
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
		e.v !== C && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), M?.set(e, t)), this.is_fork || (e.v = t);
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
			xt = 0, gt = null, yt = null, bt = null, vt = !1, j = null, M = null, jt.clear();
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
		this.#m || (this.#m = !0, k(() => {
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
			!vt && k(() => {
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
		ye();
	} catch (e) {
		We(e, gt);
	}
}
var Tt = null;
function Et(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && Mn(r) && (Tt = /* @__PURE__ */ new Set(), Ln(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && hn(r), Tt?.size > 0)) {
				jt.clear();
				for (let e of Tt) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) Tt.has(n) && (Tt.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || Ln(n);
					}
				}
				Tt.clear();
			}
		}
		Tt = null;
	}
}
function Dt(e) {
	j.schedule(e);
}
function Ot(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), A(e, m);
		for (var n = e.first; n !== null;) Ot(n, t), n = n.next;
	}
}
function kt(e) {
	A(e, m);
	for (var t = e.first; t !== null;) kt(t), t = t.next;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/reactivity/sources.js
var At = /* @__PURE__ */ new Set(), jt = /* @__PURE__ */ new Map(), Mt = !1;
function Nt(e, t) {
	return {
		f: 0,
		v: e,
		reactions: null,
		equals: Pe,
		rv: 0,
		wv: 0
	};
}
/*#__NO_SIDE_EFFECTS__*/
function N(e, t) {
	let n = Nt(e, t);
	return Tn(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function Pt(e, t = !1, n = !0) {
	let r = Nt(e);
	return t || (r.equals = Ie), r;
}
function P(e, t, n = !1) {
	return V !== null && (!H || V.f & 131072) && Be() && V.f & 4325394 && (K === null || !K.has(e)) && Se(), Ft(e, n ? zt(t) : t, bt);
}
function Ft(e, t, n = null) {
	if (!e.equals(t)) {
		jt.set(e, Cn ? t : e.v);
		var r = Ct.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && ut(t), M === null && Ke(t);
		}
		e.wv = jn(), Rt(e, h, n), Be() && W !== null && W.f & 1024 && !(W.f & 96) && (Y === null ? En([e]) : Y.push(e)), !r.is_fork && At.size > 0 && !Mt && It();
	}
	return t;
}
function It() {
	Mt = !1;
	for (let e of At) {
		e.f & 1024 && A(e, g);
		let t;
		try {
			t = Mn(e);
		} catch {
			t = !0;
		}
		t && Ln(e);
	}
	At.clear();
}
function Lt(e) {
	P(e, e.v + 1);
}
function Rt(e, t, n) {
	var r = e.reactions;
	if (r !== null) for (var i = Be(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === W)) {
			var l = (c & h) === 0;
			if (l && A(s, t), c & 131072) At.add(s);
			else if (c & 2) {
				var u = s;
				M?.delete(u), c & 65536 || (c & 512 && (W === null || !(W.f & 2097152)) && (s.f |= S), Rt(u, g, n));
			} else if (l) {
				var d = s;
				c & 16 && Tt !== null && Tt.add(d), n === null ? Dt(d) : n.push(d);
			}
		}
	}
}
function zt(t) {
	if (typeof t != "object" || !t || oe in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ N(0), u = null, d = kn, f = (e) => {
		if (kn === d) return e();
		var t = V, n = kn;
		U(null), An(d);
		var r = e();
		return U(t), An(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ N(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && be();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ N(n.value, u);
				return r.set(t, e), e;
			}) : P(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ N(C, u));
					r.set(t, e), Lt(o);
				}
			} else P(n, C), Lt(o);
			return !0;
		},
		get(e, n, i) {
			if (n === oe) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ N(zt(s ? e[n] : C), u)), r.set(n, o)), o !== void 0) {
				var c = X(o);
				return c === C ? void 0 : c;
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
				if (a !== void 0 && o !== C) return {
					enumerable: !0,
					configurable: !0,
					value: o,
					writable: !0
				};
			}
			return n;
		},
		has(e, t) {
			if (t === oe) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== C || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ N(i ? zt(e[t]) : C, u)), r.set(t, n)), X(n) === C) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ N(C, u)), r.set(d + "", p)) : P(p, C);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ N(void 0, u)), P(c, zt(n)), r.set(t, c));
			else {
				l = c.v !== C;
				var m = f(() => zt(n));
				P(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && P(g, _ + 1);
				}
				Lt(o);
			}
			return !0;
		},
		ownKeys(e) {
			X(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== C;
			});
			for (var [n, i] of r) i.v !== C && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			xe();
		}
	});
}
var Bt, Vt, Ht, Ut;
function Wt() {
	if (Bt === void 0) {
		Bt = window, Vt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		Ht = a(t, "firstChild").get, Ut = a(t, "nextSibling").get, u(e) && (e[le] = void 0, e[ce] = null, e[ue] = void 0, e.__e = void 0), u(n) && (n[de] = void 0);
	}
}
function F(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function I(e) {
	return Ht.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function Gt(e) {
	return Ut.call(e);
}
function L(e, t) {
	if (!w) return /* @__PURE__ */ I(e);
	var n = /* @__PURE__ */ I(T);
	if (n === null) n = T.appendChild(F());
	else if (t && n.nodeType !== 3) {
		var r = F();
		return n?.before(r), E(r), r;
	}
	return t && Xt(n), E(n), n;
}
function Kt(e, t = !1) {
	if (!w) {
		var n = /* @__PURE__ */ I(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ Gt(n) : n;
	}
	if (t) {
		if (T?.nodeType !== 3) {
			var r = F();
			return T?.before(r), E(r), r;
		}
		Xt(T);
	}
	return T;
}
function R(e, t = 1, n = !1) {
	let r = w ? T : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ Gt(r);
	if (!w) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = F();
			return r === null ? i?.after(a) : r.before(a), E(a), a;
		}
		Xt(r);
	}
	return E(r), r;
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
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/reactivity/effects.js
function Zt(e) {
	W === null && (V === null && ve(e), _e()), Cn && ge(e);
}
function Qt(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function $t(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= _);
	var r = {
		ctx: O,
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
			Ln(r);
		} catch (e) {
			throw B(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= b));
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
	if (!V && t & 32 && O !== null && !O.i) {
		var n = O;
		(n.e ??= []).push(e);
	} else return rn(e);
}
function rn(e) {
	return $t(4 | te, e);
}
function an(e) {
	Ct.ensure();
	let t = $t(64 | x, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? gn(t, () => {
			B(t), n(void 0);
		}) : (B(t), n(void 0));
	});
}
function on(e) {
	return $t(4, e);
}
function sn(e) {
	return $t(ie | x, e);
}
function cn(e, t = 0) {
	return $t(8 | t, e);
}
function ln(e, t = [], n = [], r = []) {
	et(r, t, n, (t) => {
		$t(8, () => {
			e(...t.map(X));
		});
	});
}
function un(e, t = 0) {
	return $t(16 | t, e);
}
function z(e) {
	return $t(32 | x, e);
}
function dn(e) {
	var t = e.teardown;
	if (t !== null) {
		let e = Cn, n = V;
		wn(!0), U(null);
		try {
			t.call(null);
		} finally {
			wn(e), U(n);
		}
	}
}
function fn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && Ye(() => {
			e.abort(fe);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : B(n, t), n = r;
	}
}
function pn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || B(t), t = n;
	}
}
function B(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (mn(e.nodes.start, e.nodes.end), n = !0), e.f |= ee, fn(e, t && !n), In(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	dn(e), e.f ^= ee, e.f |= v;
	var i = e.parent;
	i !== null && i.first !== null && hn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function mn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ Gt(e);
		e.remove(), e = n;
	}
}
function hn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function gn(e, t, n = !0) {
	var r = [];
	_n(e, r, !0);
	var i = () => {
		n && B(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function _n(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= _;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				_n(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function vn(e) {
	yn(e, !0);
}
function yn(e, t) {
	if (e.f & 8192) {
		e.f ^= _, e.f & 1024 || (A(e, h), Ct.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			yn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function bn(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ Gt(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/legacy.js
var xn = null, Sn = !1, Cn = !1;
function wn(e) {
	Cn = e;
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
function Tn(e) {
	V !== null && (K ??= /* @__PURE__ */ new Set()).add(e);
}
var q = null, J = 0, Y = null;
function En(e) {
	Y = e;
}
var Dn = 1, On = 0, kn = On;
function An(e) {
	kn = e;
}
function jn() {
	return ++Dn;
}
function Mn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 2 && (e.f &= ~S), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (Mn(a) && dt(a), a.wv > e.wv) return !0;
		}
		t & 512 && M === null && A(e, m);
	}
	return !1;
}
function Nn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(K !== null && K.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Nn(a, t, !1) : t === a && (n ? A(a, h) : a.f & 1024 && A(a, g), Dt(a));
	}
}
function Pn(e) {
	var t = q, n = J, r = Y, i = V, a = K, o = O, s = H, c = kn, l = e.f;
	q = null, J = 0, Y = null, V = l & 96 ? null : e, K = null, Le(e.ctx), H = !1, kn = ++On, e.ac !== null && (Ye(() => {
		e.ac.abort(fe);
	}), e.ac = null);
	try {
		e.f |= re;
		var u = e.fn, d = u();
		e.f |= y;
		var f = e.deps, p = j?.is_fork;
		if (q !== null) {
			var m;
			if (p || In(e, J), f !== null && J > 0) for (f.length = J + q.length, m = 0; m < q.length; m++) f[J + m] = q[m];
			else e.deps = f = q;
			if (en() && e.f & 512) for (m = J; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && J < f.length && (In(e, J), f.length = J);
		if (Be() && Y !== null && !H && f !== null && !(e.f & 6146)) for (m = 0; m < Y.length; m++) Nn(Y[m], e);
		if (i !== null && i !== e) {
			if (On++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = On;
			if (t !== null) for (let e of t) e.rv = On;
			Y !== null && (r === null ? r = Y : r.push(...Y));
		}
		return e.f & 8388608 && (e.f ^= ae), d;
	} catch (e) {
		return Ue(e);
	} finally {
		e.f ^= re, q = t, J = n, Y = r, V = i, K = a, Le(o), H = s, kn = c;
	}
}
function Fn(e, r) {
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
		s.f & 512 && (s.f ^= 512, s.f &= ~S), s.v !== C && Ke(s), s.ac !== null && Ye(() => {
			s.ac.abort(fe), s.ac = null, A(s, h);
		}), ft(s), In(s, 0);
	}
}
function In(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) Fn(e, n[r]);
}
function Ln(e) {
	var t = e.f;
	if (!(t & 16384)) {
		A(e, m);
		var n = W, r = Sn;
		W = e, Sn = !(t & 96);
		try {
			t & 16777232 ? pn(e) : fn(e), dn(e);
			var i = Pn(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = Dn;
		} finally {
			Sn = r, W = n;
		}
	}
}
function X(e) {
	var t = !!(e.f & 2);
	if (xn?.add(e), V !== null && !H && !(W !== null && W.f & 16384) && (K === null || !K.has(e))) {
		var r = V.deps;
		if (V.f & 2097152) e.rv < On && (e.rv = On, q === null && r !== null && r[J] === e ? J++ : q === null ? q = [e] : q.push(e));
		else {
			V.deps ??= [], n.call(V.deps, e) || V.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [V] : n.call(i, V) || i.push(V);
		}
	}
	if (Cn && jt.has(e)) return jt.get(e);
	if (t) {
		var a = e;
		if (Cn) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || zn(a)) && (o = ut(a)), jt.set(a, o), o;
		}
		var s = !(a.f & 512) && !H && V !== null && (Sn || !!(V.f & 512)), c = (a.f & y) === 0;
		Mn(a) && (s && (a.f |= 512), dt(a)), s && !c && (pt(a), Rn(a));
	}
	if (M?.has(e)) return M.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function Rn(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (pt(t), Rn(t));
}
function zn(e) {
	if (e.v === C) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (jt.has(t) || t.f & 2 && zn(t)) return !0;
	return !1;
}
function Bn(e) {
	var t = H;
	try {
		return H = !0, e();
	} finally {
		H = t;
	}
}
function Vn(e) {
	if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
		if (oe in e) Hn(e);
		else if (!Array.isArray(e)) for (let t in e) {
			let n = e[t];
			typeof n == "object" && n && oe in n && Hn(n);
		}
	}
}
function Hn(e, t = /* @__PURE__ */ new Set()) {
	if (typeof e == "object" && e && !(e instanceof EventTarget) && !t.has(e)) {
		t.add(e), e instanceof Date && e.getTime();
		for (let n in e) try {
			Hn(e[n], t);
		} catch {}
		let n = l(e);
		if (n !== Object.prototype && n !== Array.prototype && n !== Map.prototype && n !== Set.prototype && n !== Date.prototype) {
			let t = o(n);
			for (let n in t) {
				let r = t[n].get;
				if (r) try {
					r.call(e);
				} catch {}
			}
		}
	}
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var Un = ["touchstart", "touchmove"];
function Wn(e) {
	return Un.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/elements/events.js
var Gn = Symbol("events"), Kn = /* @__PURE__ */ new Set(), qn = /* @__PURE__ */ new Set();
function Jn(e) {
	if (!w) return;
	e.removeAttribute("onload"), e.removeAttribute("onerror");
	let t = e.__e;
	t !== void 0 && (e.__e = void 0, queueMicrotask(() => {
		e.isConnected && e.dispatchEvent(t);
	}));
}
function Yn(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || er.call(t, e), !e.cancelBubble) return Ye(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? k(() => {
		t.addEventListener(e, i, r);
	}) : t.addEventListener(e, i, r), i;
}
function Xn(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = Yn(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && tn(() => {
		t.removeEventListener(e, o, a);
	});
}
function Zn(e, t, n) {
	(t[Gn] ??= {})[e] = n;
}
function Qn(e) {
	for (var t = 0; t < e.length; t++) Kn.add(e[t]);
	for (var n of qn) n(e);
}
var $n = null;
function er(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	$n = e;
	var s = 0, c = $n === e && e[Gn];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[Gn] = t;
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
					var h = o[Gn]?.[r];
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
			e[Gn] = t, delete e.currentTarget, U(d), G(f);
		}
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/reconciler.js
var tr = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function nr(e) {
	return tr?.createHTML(e) ?? e;
}
function rr(e) {
	var t = Yt("template");
	return t.innerHTML = nr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/template.js
function ir(e, t) {
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
		if (w) return ir(T, null), T;
		i === void 0 && (i = rr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ I(i)));
		var t = r || Vt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ I(t), s = t.lastChild;
			ir(o, s);
		} else ir(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function ar(e, t, n = "svg") {
	var r = !e.startsWith("<!>"), i = !!(t & 1), a = `<${n}>${r ? e : "<!>" + e}</${n}>`, o;
	return () => {
		if (w) return ir(T, null), T;
		if (!o) {
			var e = /* @__PURE__ */ I(rr(a));
			if (i) for (o = document.createDocumentFragment(); /* @__PURE__ */ I(e);) o.appendChild(/* @__PURE__ */ I(e));
			else o = /* @__PURE__ */ I(e);
		}
		var t = o.cloneNode(!0);
		if (i) {
			var n = /* @__PURE__ */ I(t), r = t.lastChild;
			ir(n, r);
		} else ir(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function or(e, t) {
	return /* @__PURE__ */ ar(e, t, "svg");
}
function sr() {
	if (w) return ir(T, null), T;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = F();
	return e.append(t, n), ir(t, n), e;
}
function Q(e, t) {
	if (w) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = T), Ae();
		return;
	}
	e !== null && e.before(t);
}
function cr(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[de] ??= e.nodeValue) && (e[de] = n, e.nodeValue = `${n}`);
}
function lr(e, t) {
	return dr(e, t);
}
var ur = /* @__PURE__ */ new Map();
function dr(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	Wt();
	var l = void 0, u = an(() => {
		var s = n ?? t.appendChild(F());
		Qe(s, { pending: () => {} }, (t) => {
			Re({});
			var n = O;
			if (o && (n.c = o), a && (i.$$events = a), w && ir(t, null), l = e(t, i) || {}, w && (W.nodes.end = T, T === null || T.nodeType !== 8 || T.data !== "]")) throw De(), we;
			ze();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = Wn(r);
					for (let e of [t, document]) {
						var a = ur.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), ur.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, er, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(Kn)), qn.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = ur.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, er), r.delete(e), r.size === 0 && ur.delete(n)) : r.set(e, i);
			}
			qn.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return fr.set(l, u), l;
}
var fr = /* @__PURE__ */ new WeakMap();
function pr(e, t) {
	let n = fr.get(e);
	return n ? (fr.delete(e), n(t)) : Promise.resolve();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var mr = class {
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
			if (n) vn(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (vn(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
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
						bn(r, t), t.append(F()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else B(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), gn(r, i, !1)) : i();
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
				var i = document.createDocumentFragment(), a = F();
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
		} else w && (this.anchor = T), this.#a(n);
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/blocks/if.js
function hr(e, t, n = !1) {
	var r;
	w && (r = T, Ae());
	var i = new mr(e), a = n ? b : 0;
	function o(e, t) {
		if (w) {
			var n = Ne(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Me();
				E(a), i.anchor = a, ke(!1), i.ensure(e, t), ke(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	un(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/blocks/each.js
function gr(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		gn(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					_r(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
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
		_r(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function _r(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= ne, bn(a, document.createDocumentFragment())) : B(t[i], n);
	}
}
var vr;
function yr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = w ? E(/* @__PURE__ */ I(u)) : u.appendChild(F());
	}
	w && Ae();
	var d = null, f = /* @__PURE__ */ ct(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, xr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= ne, Cr(d, null, c)) : vn(d) : gn(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: un(() => {
			p = X(f);
			var e = p.length;
			let t = !1;
			w && Ne(c) === "[!" != (e === 0) && (c = Me(), E(c), ke(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = j, v = Jt(), y = 0; y < e; y += 1) {
				w && T.nodeType === 8 && T.data === "]" && (c = T, t = !0, ke(!1));
				var ee = p[y], b = a(ee, y), x = h ? null : l.get(b);
				x ? (x.v && Ft(x.v, ee), x.i && Ft(x.i, y), v && u.unskip_effect(x.e)) : (x = Sr(l, h ? c : vr ??= F(), ee, b, y, o, n, i), h || (x.e.f |= ne), l.set(b, x)), r.add(b);
			}
			if (e === 0 && s && !d && (h ? d = z(() => s(c)) : (d = z(() => s(vr ??= F())), d.f |= ne)), e > r.size && he("", "", ""), w && e > 0 && E(Me()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && ke(!0), X(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, w && (c = T);
}
function br(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function xr(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = br(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (vn(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= ne, _ === l) Cr(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), wr(e, d, _), wr(e, _, y), Cr(_, y, n), d = _, p = [], m = [], l = br(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var ee = m[0], b;
					d = ee.prev;
					var x = p[0], te = p[p.length - 1];
					for (b = 0; b < p.length; b += 1) Cr(p[b], ee, n);
					for (b = 0; b < m.length; b += 1) u.delete(m[b]);
					wr(e, x.prev, te.next), wr(e, d, x), wr(e, te, ee), l = ee, d = te, --v, p = [], m = [];
				} else u.delete(_), Cr(_, l, n), wr(e, _.prev, _.next), wr(e, _, d === null ? e.effect.first : d.next), wr(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = br(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = br(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (_r(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var S = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || S.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && S.push(l), l = br(l.next);
		var re = S.length;
		if (re > 0) {
			var ie = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < re; v += 1) S[v].nodes?.a?.measure();
				for (v = 0; v < re; v += 1) S[v].nodes?.a?.fix();
			}
			gr(e, S, ie);
		}
	}
	o && k(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function Sr(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Nt(n) : /* @__PURE__ */ Pt(n, !1, !1) : null, l = o & 2 ? Nt(i) : null;
	return {
		v: c,
		i: l,
		e: z(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function Cr(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ Gt(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function wr(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/elements/actions.js
function Tr(e, t, n) {
	on(() => {
		var r = Bn(() => t(e, n?.()) || {});
		if (n && r?.update) {
			var i = !1, a = {};
			cn(() => {
				var e = n();
				Vn(e), i && Fe(a, e) && (a = e, r.update(e));
			}), i = !0;
		}
		if (r?.destroy) return () => r.destroy();
	});
}
//#endregion
//#region ../../node_modules/.bun/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function Er(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = Er(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function Dr() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = Er(e)) && (r && (r += " "), r += t);
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/shared/attributes.js
function Or(e) {
	return typeof e == "object" ? Dr(e) : e ?? "";
}
var kr = [..." 	\n\r\f\xA0\v﻿"];
function Ar(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || kr.includes(r[o - 1])) && (s === r.length || kr.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/elements/class.js
function jr(e, t, n, r, i, a) {
	var o = e[le];
	if (w || o !== n || o === void 0) {
		var s = Ar(n, r, a);
		(!w || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[le] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var Mr = Symbol("is custom element"), Nr = Symbol("is html"), Pr = pe ? "link" : "LINK";
function Fr(e, t, n, r) {
	var i = Ir(e);
	w && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Pr) || i[t] !== (i[t] = n) && (t === "loading" && (e[se] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && Rr(e).includes(t) ? e[t] = n : e.setAttribute(t, n));
}
function Ir(e) {
	return e[ce] ??= {
		[Mr]: e.nodeName.includes("-"),
		[Nr]: e.namespaceURI === Te
	};
}
var Lr = /* @__PURE__ */ new Map();
function Rr(e) {
	var t = e.getAttribute("is") || e.nodeName, n = Lr.get(t);
	if (n) return n;
	Lr.set(t, n = []);
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.push(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region neoshell/src/lib.ts
function $(e) {
	return typeof e != "object" || !e ? {} : e;
}
//#endregion
//#region neoshell/src/Topbar.svelte
var zr = /* @__PURE__ */ Z("<button> </button>"), Br = /* @__PURE__ */ Z("<div class=\"flex h-full items-center justify-between gap-6 bg-base-200/40 px-3 text-[13px]\n    font-medium text-base-content select-none\"><div class=\"flex min-w-0 items-center gap-3\"><div class=\"flex items-center gap-1\"></div> <span class=\"max-w-[48ch] truncate text-base-content/60\"> </span></div> <div></div></div>");
function Vr(e, t) {
	Re(t, !0);
	let n = /* @__PURE__ */ N(zt([])), r = /* @__PURE__ */ N(-1), i = /* @__PURE__ */ N("");
	nn(() => {
		let e = [
			t.bus.subscribe("hypr.workspaces", (e) => {
				P(n, a(e.data), !0);
			}),
			t.bus.subscribe("hypr.activeworkspace", (e) => {
				P(r, s(e.data), !0);
			}),
			t.bus.subscribe("hypr.activewindow", (e) => {
				P(i, c(e.data), !0);
			})
		];
		return () => {
			for (let t of e) t();
		};
	});
	function a(e) {
		if (!Array.isArray(e)) return [];
		let t = [];
		for (let n of e) {
			let e = $(n);
			typeof e.id == "number" && e.id > 0 && t.push({
				id: e.id,
				name: o(e)
			});
		}
		return t.sort((e, t) => e.id - t.id);
	}
	function o(e) {
		return typeof e.name == "string" && e.name !== "" ? e.name : String(e.id);
	}
	function s(e) {
		let t = $(e).id;
		return typeof t == "number" ? t : -1;
	}
	function c(e) {
		let t = $(e).title;
		return typeof t == "string" ? t : "";
	}
	function l(e) {
		t.bus.call("hypr:dispatch", {
			dispatcher: "workspace",
			arg: String(e)
		});
	}
	let u = "h-5 min-w-5 cursor-pointer rounded-md px-1.5 text-center text-[11px] leading-5 transition-colors duration-150 ";
	function d(e) {
		return e ? u + "bg-base-content font-semibold text-base-100" : u + "text-base-content/50 hover:bg-base-content/10 hover:text-base-content";
	}
	function f(e, t) {
		e.appendChild(t);
	}
	var p = Br(), m = L(p), h = L(m);
	yr(h, 21, () => X(n), (e) => e.id, (e, t) => {
		var n = zr(), i = L(n, !0);
		D(n), ln((e) => {
			jr(n, 1, e), cr(i, X(t).name);
		}, [() => Or(d(X(t).id === X(r)))]), Zn("click", n, () => l(X(t).id)), Q(e, n);
	}), D(h);
	var g = R(h, 2), _ = L(g, !0);
	D(g), D(m), Tr(R(m, 2), (e, t) => f?.(e, t), () => t.childrenHost), D(p), ln(() => cr(_, X(i))), Q(e, p), ze();
}
Qn(["click"]);
//#endregion
//#region neoshell/src/Clock.svelte
var Hr = /* @__PURE__ */ Z("<div class=\"flex items-center gap-2 tabular-nums\"><span class=\"text-base-content/60\"> </span> <span> </span></div>");
function Ur(e, t) {
	Re(t, !0);
	let n = new Intl.DateTimeFormat(void 0, {
		weekday: "short",
		day: "numeric",
		month: "short"
	}), r = new Intl.DateTimeFormat(void 0, {
		hour: "2-digit",
		minute: "2-digit"
	}), i = /* @__PURE__ */ N(zt(/* @__PURE__ */ new Date()));
	nn(() => {
		let e = setInterval(() => {
			P(i, /* @__PURE__ */ new Date(), !0);
		}, 1e3);
		return () => {
			clearInterval(e);
		};
	});
	var a = Hr(), o = L(a), s = L(o, !0);
	D(o);
	var c = R(o, 2), l = L(c, !0);
	D(c), D(a), ln((e, t) => {
		cr(s, e), cr(l, t);
	}, [() => n.format(X(i)), () => r.format(X(i))]), Q(e, a), ze();
}
//#endregion
//#region neoshell/src/Battery.svelte
var Wr = /* @__PURE__ */ or("<path d=\"M12.5 2.2 9 7h2.6l-1.6 4.6L13.5 6h-2.6z\" fill=\"var(--color-base-100)\" stroke=\"currentColor\" stroke-width=\"0.75\"></path>"), Gr = /* @__PURE__ */ Z("<div class=\"flex items-center gap-1.5 text-base-content/80 tabular-nums\"><span> </span> <svg width=\"25\" height=\"13\" viewBox=\"0 0 25 13\" fill=\"none\" class=\"shrink-0\"><rect x=\"0.5\" y=\"0.5\" width=\"21\" height=\"12\" rx=\"3\" stroke=\"currentColor\" stroke-opacity=\"0.5\"></rect><rect x=\"2\" y=\"2\" height=\"9\" rx=\"1.5\"></rect><path d=\"M23.5 4.5v4a2 2 0 0 0 0-4z\" fill=\"currentColor\" fill-opacity=\"0.5\"></path><!></svg></div>");
function Kr(e, t) {
	Re(t, !0);
	let n = /* @__PURE__ */ N(-1), r = /* @__PURE__ */ N(!1);
	nn(() => t.bus.subscribe("system.battery", (e) => {
		let t = $(e.data);
		typeof t.percent == "number" && P(n, Math.round(t.percent), !0), P(r, t.charging === !0);
	}));
	let i = /* @__PURE__ */ st(() => Math.max(2, Math.round(X(n) / 100 * 18))), a = /* @__PURE__ */ st(() => o(X(n), X(r)));
	function o(e, t) {
		return e >= 0 && e <= 15 && !t ? "fill-error" : "fill-current";
	}
	var s = sr(), c = Kt(s), l = (e) => {
		var t = Gr(), o = L(t), s = L(o);
		D(o);
		var c = R(o, 2), l = R(L(c)), u = R(l, 2), d = (e) => {
			Q(e, Wr());
		};
		hr(u, (e) => {
			X(r) && e(d);
		}), D(c), D(t), ln(() => {
			cr(s, `${X(n) ?? ""}%`), Fr(l, "width", X(i)), jr(l, 0, Or(X(a)));
		}), Q(e, t);
	};
	hr(c, (e) => {
		X(n) >= 0 && e(l);
	}), Q(e, s), ze();
}
//#endregion
//#region neoshell/src/Volume.svelte
var qr = /* @__PURE__ */ or("<path d=\"M10 4.5a3.5 3.5 0 0 1 0 5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"></path>"), Jr = /* @__PURE__ */ or("<path d=\"M11.8 3a6 6 0 0 1 0 8\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"></path>"), Yr = /* @__PURE__ */ or("<path d=\"M10 5l4 4M14 5l-4 4\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"></path>"), Xr = /* @__PURE__ */ Z("<span class=\"text-base-content/40\">muted</span>"), Zr = /* @__PURE__ */ Z("<span> </span>"), Qr = /* @__PURE__ */ Z("<div class=\"flex items-center gap-1.5 text-base-content/80 tabular-nums\"><svg width=\"15\" height=\"14\" viewBox=\"0 0 15 14\" fill=\"none\" class=\"shrink-0\"><path d=\"M2 5h2.5L8 2v10L4.5 9H2z\" fill=\"currentColor\"></path><!><!><!></svg> <!></div>");
function $r(e, t) {
	Re(t, !0);
	let n = /* @__PURE__ */ N(-1), r = /* @__PURE__ */ N(!1);
	nn(() => t.bus.subscribe("system.volume", (e) => {
		let t = $(e.data);
		typeof t.volume == "number" && P(n, t.volume, !0), P(r, t.muted === !0);
	}));
	var i = sr(), a = Kt(i), o = (e) => {
		var t = Qr(), i = L(t), a = R(L(i)), o = (e) => {
			Q(e, qr());
		};
		hr(a, (e) => {
			!X(r) && X(n) > 0 && e(o);
		});
		var s = R(a), c = (e) => {
			Q(e, Jr());
		};
		hr(s, (e) => {
			!X(r) && X(n) > .6 && e(c);
		});
		var l = R(s), u = (e) => {
			Q(e, Yr());
		};
		hr(l, (e) => {
			X(r) && e(u);
		}), D(i);
		var d = R(i, 2), f = (e) => {
			Q(e, Xr());
		}, p = (e) => {
			var t = Zr(), r = L(t);
			D(t), ln((e) => cr(r, `${e ?? ""}%`), [() => Math.round(X(n) * 100)]), Q(e, t);
		};
		hr(d, (e) => {
			X(r) ? e(f) : e(p, -1);
		}), D(t), Q(e, t);
	};
	hr(a, (e) => {
		X(n) >= 0 && e(o);
	}), Q(e, i), ze();
}
//#endregion
//#region neoshell/src/Dock.svelte
var ei = /* @__PURE__ */ Z("<span class=\"absolute bottom-0 h-1 w-1 rounded-full bg-base-content/80\"></span>"), ti = /* @__PURE__ */ Z("<button class=\"relative flex w-13 origin-bottom cursor-pointer flex-col items-center pb-1.5\n          transition-transform duration-150 hover:-translate-y-1.5 hover:scale-120\"><img class=\"h-11 w-11 object-contain drop-shadow-md\"/> <!></button>"), ni = /* @__PURE__ */ Z("<div class=\"flex h-full items-end justify-center pb-2\"><div class=\"flex items-end gap-1 rounded-2xl border border-base-content/10 bg-base-200/40 px-2 py-1.5\"></div></div>");
function ri(e, t) {
	Re(t, !0);
	let n = /* @__PURE__ */ N(zt([])), r = /* @__PURE__ */ N(zt(/* @__PURE__ */ new Set())), i = [];
	nn(() => {
		let e = t.bus.subscribe("hypr.windows", (e) => {
			P(r, u(e.data), !0);
		}), n = t.bus.subscribe("config", (e) => {
			a(d(e.data));
		});
		return o(), () => {
			e(), n();
		};
	});
	function a(e) {
		JSON.stringify(e) !== JSON.stringify(i) && (i = e, o());
	}
	async function o() {
		let e = await t.bus.call("apps:list", {});
		Array.isArray(e) && P(n, c(e.map(s), i), !0);
	}
	function s(e) {
		let t = $(e), n = {
			id: "",
			name: "",
			exec: "",
			icon: "",
			wmClass: ""
		};
		return typeof t.id == "string" && (n.id = t.id), typeof t.name == "string" && (n.name = t.name), typeof t.exec == "string" && (n.exec = t.exec), typeof t.icon == "string" && (n.icon = t.icon), typeof t.wmClass == "string" && (n.wmClass = t.wmClass), n;
	}
	function c(e, t) {
		if (t.length === 0) return e.slice(0, 8);
		let n = [];
		for (let r of t) {
			let t = l(e, r);
			t !== null && n.push(t);
		}
		return n;
	}
	function l(e, t) {
		let n = t.toLowerCase();
		for (let t of e) if (t.id.toLowerCase() === n || t.name.toLowerCase() === n) return t;
		return null;
	}
	function u(e) {
		let t = /* @__PURE__ */ new Set();
		if (!Array.isArray(e)) return t;
		for (let n of e) {
			let e = $(n).class;
			typeof e == "string" && e !== "" && t.add(e.toLowerCase());
		}
		return t;
	}
	function d(e) {
		let t = $($(e).dock);
		return Array.isArray(t.pinned) ? t.pinned.filter((e) => typeof e == "string") : [];
	}
	function f(e) {
		return e.wmClass !== "" && X(r).has(e.wmClass.toLowerCase());
	}
	function p(e) {
		if (f(e)) {
			t.bus.call("hypr:dispatch", {
				dispatcher: "focuswindow",
				arg: `class:${e.wmClass}`
			});
			return;
		}
		t.bus.call("apps:launch", { command: e.exec });
	}
	function m(e) {
		return `/appicon/${encodeURIComponent(e.icon)}?size=96`;
	}
	var h = ni(), g = L(h);
	yr(g, 21, () => X(n), (e) => e.id, (e, t) => {
		var n = ti(), r = L(n), i = R(r, 2), a = (e) => {
			Q(e, ei());
		}, o = /* @__PURE__ */ st(() => f(X(t)));
		hr(i, (e) => {
			X(o) && e(a);
		}), D(n), ln((e) => {
			Fr(n, "title", X(t).name), Fr(r, "src", e), Fr(r, "alt", X(t).name);
		}, [() => m(X(t))]), Zn("click", n, () => p(X(t))), Q(e, n);
	}), D(g), D(h), Q(e, h), ze();
}
Qn(["click"]);
//#endregion
//#region neoshell/src/Wallpaper.svelte
var ii = /* @__PURE__ */ Z("<img class=\"h-full w-full object-cover\" alt=\"\"/>"), ai = /* @__PURE__ */ Z("<div class=\"fixed inset-0 bg-base-300\"><!></div>");
function oi(e, t) {
	Re(t, !0);
	let n = /* @__PURE__ */ N(""), r = /* @__PURE__ */ N(!1);
	nn(() => t.bus.subscribe("config", (e) => {
		let t = i(e.data);
		t !== X(n) && (P(n, t, !0), P(r, !1));
	}));
	function i(e) {
		let t = $($(e).appearance);
		return typeof t.wallpaper == "string" ? t.wallpaper : "";
	}
	var a = ai(), o = L(a), s = (e) => {
		var t = ii();
		ln((e) => Fr(t, "src", e), [() => `/wallpaper?v=${encodeURIComponent(X(n))}`]), Xn("error", t, () => {
			P(r, !0);
		}), Jn(t), Q(e, t);
	};
	hr(o, (e) => {
		X(r) || e(s);
	}), D(a), Q(e, a), ze();
}
//#endregion
//#region neoshell/src/views.ts
var si = {
	name: "neoshell-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = e.require("ui"), n = e.require("bus");
		e.effect(() => ui()), e.effect(() => t.register("neoshell.topbar", li(n))), e.effect(() => t.register("neoshell.clock", ci(Ur, {}))), e.effect(() => t.register("neoshell.battery", ci(Kr, { bus: n }))), e.effect(() => t.register("neoshell.volume", ci($r, { bus: n }))), e.effect(() => t.register("neoshell.dock", ci(ri, { bus: n }))), e.effect(() => t.register("neoshell.wallpaper", ci(oi, { bus: n })));
	}
};
function ci(e, t) {
	return (n) => {
		let r = lr(e, {
			target: n,
			props: t
		});
		return { dispose() {
			pr(r);
		} };
	};
}
function li(e) {
	return (t) => {
		let n = document.createElement("div");
		n.className = "flex shrink-0 items-center gap-4";
		let r = lr(Vr, {
			target: t,
			props: {
				bus: e,
				childrenHost: n
			}
		});
		return {
			dispose() {
				pr(r);
			},
			childrenHost: n
		};
	};
}
function ui() {
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = "/plugins/neoshell/views.css", document.head.appendChild(e), () => {
		e.remove();
	};
}
//#endregion
export { si as default };
