//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/utils.js
var e = Array.isArray, t = Array.prototype.indexOf, n = Array.prototype.includes, r = Array.from, i = Object.defineProperty, a = Object.getOwnPropertyDescriptor, o = Object.prototype, s = Array.prototype, c = Object.getPrototypeOf, l = Object.isExtensible, u = () => {};
function d(e) {
	for (var t = 0; t < e.length; t++) e[t]();
}
function f() {
	var e, t;
	return {
		promise: new Promise((n, r) => {
			e = n, t = r;
		}),
		resolve: e,
		reject: t
	};
}
var p = 1024, m = 2048, h = 4096, g = 8192, _ = 16384, v = 32768, y = 1 << 25, b = 65536, x = 1 << 19, S = 1 << 20, ee = 1 << 25, te = 65536, ne = 1 << 21, re = 1 << 22, ie = 1 << 23, ae = Symbol("$state"), oe = Symbol("legacy props"), se = Symbol("attributes"), ce = Symbol("class"), le = Symbol("style"), ue = Symbol("text"), de = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}();
globalThis.document?.contentType;
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
var Ce = {}, C = Symbol("uninitialized");
function we() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function Te(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function Ee() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/hydration.js
var w = !1;
function De(e) {
	w = e;
}
var T;
function E(e) {
	if (e === null) throw Te(), Ce;
	return T = e;
}
function Oe() {
	return E(/* @__PURE__ */ I(T));
}
function D(e) {
	if (w) {
		if (/* @__PURE__ */ I(T) !== null) throw Te(), Ce;
		T = e;
	}
}
function ke(e = 1) {
	if (w) {
		for (var t = e, n = T; t--;) n = /* @__PURE__ */ I(n);
		T = n;
	}
}
function Ae(e = !0) {
	for (var t = 0, n = T;;) {
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
function je(e) {
	if (!e || e.nodeType !== 8) throw Te(), Ce;
	return e.data;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/equality.js
function Me(e) {
	return e === this.v;
}
function Ne(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function Pe(e) {
	return !Ne(e, this.v);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/context.js
var O = null;
function Fe(e) {
	O = e;
}
function Ie(e, t = !1, n) {
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
function Le(e) {
	var t = O, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) rn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, O = t.p, e ?? {};
}
function Re() {
	return !0;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/task.js
var ze = [];
function Be() {
	var e = ze;
	ze = [], d(e);
}
function Ve(e) {
	if (ze.length === 0 && !vt) {
		var t = ze;
		queueMicrotask(() => {
			t === ze && Be();
		});
	}
	ze.push(e);
}
function He(e) {
	var t = W;
	if (t === null) return V.f |= ie, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	Ue(e, t);
}
function Ue(e, t) {
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
var We = ~(m | h | p);
function k(e, t) {
	e.f = e.f & We | t;
}
function Ge(e) {
	e.f & 512 || e.deps === null ? k(e, p) : k(e, h);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/utils.js
function Ke(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= te, Ke(t.deps));
}
function qe(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), Ke(e.deps), k(e, p);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/store.js
var Je = !1;
function Ye(e) {
	var t = Je;
	try {
		return Je = !1, [e(), Je];
	} finally {
		Je = t;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function Xe(e) {
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
function Ze(e) {
	let t = 0, n = Nt(0), r;
	return () => {
		en() && (X(n), cn(() => (t === 0 && (r = Bn(() => e(() => Lt(n)))), t += 1, () => {
			Ve(() => {
				--t, t === 0 && (r?.(), r = void 0, Lt(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var Qe = b | x;
function $e(e, t, n, r) {
	new et(e, t, n, r);
}
var et = class {
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
	#h = Ze(() => (this.#m = Nt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = un(() => {
			if (w) {
				let e = this.#t;
				Oe();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, Qe), w && (this.#e = T);
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
		Ve(r), t && (this.#s = z(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				Ee();
				return;
			}
			t = !0, n && Se(), this.#s !== null && gn(this.#s, () => {
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
					Ue(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = z(() => e(this.#e)), Ve(() => {
			var e = this.#c = document.createDocumentFragment(), t = F();
			e.append(t), this.#a = this.#S(() => z(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, gn(this.#o, () => {
				this.#o = null;
			}), this.#x(A));
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
			} else this.#x(A);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		qe(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = V, r = O;
		G(this.#i), U(this.#i), Fe(this.#i.ctx);
		try {
			return wt.ensure(), e();
		} catch (e) {
			return He(e), null;
		} finally {
			G(t), U(n), Fe(r);
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
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, Ve(() => {
			this.#d = !1, this.#m && Ft(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), X(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		A?.is_fork ? (this.#a && A.skip_effect(this.#a), this.#o && A.skip_effect(this.#o), this.#s && A.skip_effect(this.#s), A.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (B(this.#a), null), this.#o &&= (B(this.#o), null), this.#s &&= (B(this.#s), null), w && (E(this.#t), ke(), E(Ae()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return z(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return Ue(e, this.#i.parent), null;
				}
			}));
		};
		Ve(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				Ue(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => Ue(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/async.js
function tt(e, t, n, r) {
	let i = Re() ? at : lt;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = nt(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				Ue(e, s);
			}
			rt();
		}
	}
	var d = it();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ st(e))).then(u).catch((e) => Ue(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), rt();
	}) : f();
}
function nt() {
	var e = W, t = V, n = O, r = A;
	return function(i = !0) {
		G(e), U(t), Fe(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function rt(e = !0) {
	G(null), U(null), Fe(null), e && A?.deactivate();
}
function it() {
	var e = W, t = e.b, n = A, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function at(e) {
	var t = 2 | m;
	return W !== null && (W.f |= x), {
		ctx: O,
		deps: null,
		effects: null,
		equals: Me,
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
var ot = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function st(e, t, n) {
	let r = W;
	r === null && fe();
	var i = void 0, a = Nt(C), o = !V, s = /* @__PURE__ */ new Set();
	return sn(() => {
		var t = W, n = f();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== de && n.reject(e);
			}).finally(rt);
		} catch (e) {
			n.reject(e), rt();
		}
		var c = A;
		if (o) {
			if (t.f & 32768) var l = it();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(ot);
			else for (let e of s.values()) e.reject(ot);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== ot && (c.activate(), t ? (a.f |= ie, Ft(a, t)) : (a.f & 8388608 && (a.f ^= ie), Ft(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), tn(() => {
		for (let e of s) e.reject(ot);
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
function ct(e) {
	let t = /* @__PURE__ */ at(e);
	return Tn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function lt(e) {
	let t = /* @__PURE__ */ at(e);
	return t.equals = Pe, t;
}
function ut(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) B(t[n]);
	}
}
function dt(e) {
	var t, n = W, r = e.parent;
	if (!Cn && r !== null && e.v !== C && r.f & 24576) return we(), e.v;
	G(r);
	try {
		e.f &= ~te, ut(e), t = Pn(e);
	} finally {
		G(n);
	}
	return t;
}
function ft(e) {
	var t = dt(e);
	if (!e.equals(t) && (e.wv = jn(), (!A?.is_fork || e.deps === null) && (A === null ? e.v = t : (A.capture(e, t, !0), gt?.capture(e, t, !0)), e.deps === null))) {
		k(e, p);
		return;
	}
	Cn || (j === null ? Ge(e) : (en() || A?.is_fork) && j.set(e, t));
}
function pt(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && Xe(() => {
		t.ac.abort(de), t.ac = null;
	}), t.fn !== null && (t.teardown = u), In(t, 0), fn(t));
}
function mt(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && Ln(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/batch.js
var ht = null, A = null, gt = null, j = null, _t = null, vt = !1, yt = !1, bt = null, xt = null, St = 0, Ct = 1, wt = class e {
	id = Ct++;
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
		ht === null ? ht = this : (ht.#n = this, this.#t = ht), ht = this;
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
			for (var r of n.d) k(r, m), t(r);
			for (r of n.m) k(r, h), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		this.#e = !0, St++ > 1e3 && (this.#x(), Tt());
		for (let e of this.#u) this.#d.delete(e), k(e, m), this.schedule(e);
		for (let e of this.#d) k(e, h), this.schedule(e);
		let t = this.#c;
		this.#c = [], this.apply();
		var n = bt = [], r = [], i = xt = [];
		for (let e of t) try {
			this.#_(e, n, r);
		} catch (t) {
			throw kt(e), this.#h() || this.discard(), t;
		}
		if (A = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (bt = null, xt = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) Ot(e, t);
			i.length > 0 && A.#g();
			return;
		}
		let o = this.#v();
		if (o) {
			this.#b(r), this.#b(n), o.#y(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), gt = this, Et(r), Et(n), gt = null, this.#s?.resolve();
		var s = A;
		if (this.#a === 0 && (this.#c.length === 0 || s !== null) && this.#x(), this.#c.length > 0) {
			if (s !== null) {
				let e = s;
				e.#c.push(...this.#c.filter((t) => !e.#c.includes(t)));
			} else s = this;
		}
		s !== null && s.#g();
	}
	#_(e, t, n) {
		e.f ^= p;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= p : i & 4 ? t.push(r) : Mn(r) && (i & 16 && this.#d.add(r), Ln(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), k(i, m), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#x(), A = this, this.#g();
	}
	#b(e) {
		for (var t = 0; t < e.length; t += 1) qe(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== C && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), j?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		A = this;
	}
	deactivate() {
		A = null, j = null;
	}
	flush() {
		try {
			yt = !0, A = this, this.#g();
		} finally {
			St = 0, _t = null, bt = null, xt = null, yt = !1, A = null, j = null, jt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(ot);
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
		this.#m || (this.#m = !0, Ve(() => {
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
		return (this.#s ??= f()).promise;
	}
	static ensure() {
		if (A === null) {
			let t = A = new e();
			!yt && Ve(() => {
				t.#e || t.flush();
			});
		}
		return A;
	}
	apply() {
		j = null;
	}
	schedule(e) {
		if (_t = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		for (var t = e; t.parent !== null;) {
			t = t.parent;
			var n = t.f;
			if (bt !== null && t === W && (V === null || !(V.f & 2))) return;
			if (n & 96) {
				if (!(n & 1024)) return;
				t.f ^= p;
			}
		}
		this.#c.push(t);
	}
	#x() {
		if (this.linked) {
			var e = this.#t, t = this.#n;
			e === null || (e.#n = t), t === null ? ht = e : t.#t = e, this.linked = !1;
		}
	}
};
function Tt() {
	try {
		_e();
	} catch (e) {
		Ue(e, _t);
	}
}
var M = null;
function Et(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && Mn(r) && (M = /* @__PURE__ */ new Set(), Ln(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && hn(r), M?.size > 0)) {
				jt.clear();
				for (let e of M) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) M.has(n) && (M.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || Ln(n);
					}
				}
				M.clear();
			}
		}
		M = null;
	}
}
function Dt(e) {
	A.schedule(e);
}
function Ot(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), k(e, p);
		for (var n = e.first; n !== null;) Ot(n, t), n = n.next;
	}
}
function kt(e) {
	k(e, p);
	for (var t = e.first; t !== null;) kt(t), t = t.next;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/sources.js
var At = /* @__PURE__ */ new Set(), jt = /* @__PURE__ */ new Map(), Mt = !1;
function Nt(e, t) {
	return {
		f: 0,
		v: e,
		reactions: null,
		equals: Me,
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
	return t || (r.equals = Pe), r;
}
function P(e, t, n = !1) {
	return V !== null && (!H || V.f & 131072) && Re() && V.f & 4325394 && (K === null || !K.has(e)) && xe(), Ft(e, n ? zt(t) : t, xt);
}
function Ft(e, t, n = null) {
	if (!e.equals(t)) {
		jt.set(e, Cn ? t : e.v);
		var r = wt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && dt(t), j === null && Ge(t);
		}
		e.wv = jn(), Rt(e, m, n), Re() && W !== null && W.f & 1024 && !(W.f & 96) && (Y === null ? En([e]) : Y.push(e)), !r.is_fork && At.size > 0 && !Mt && It();
	}
	return t;
}
function It() {
	Mt = !1;
	for (let e of At) {
		e.f & 1024 && k(e, h);
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
	if (r !== null) for (var i = Re(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === W)) {
			var l = (c & m) === 0;
			if (l && k(s, t), c & 131072) At.add(s);
			else if (c & 2) {
				var u = s;
				j?.delete(u), c & 65536 || (c & 512 && (W === null || !(W.f & 2097152)) && (s.f |= te), Rt(u, h, n));
			} else if (l) {
				var d = s;
				c & 16 && M !== null && M.add(d), n === null ? Dt(d) : n.push(d);
			}
		}
	}
}
function zt(t) {
	if (typeof t != "object" || !t || ae in t) return t;
	let n = c(t);
	if (n !== o && n !== s) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), l = /* @__PURE__ */ N(0), u = null, d = kn, f = (e) => {
		if (kn === d) return e();
		var t = V, n = kn;
		U(null), An(d);
		var r = e();
		return U(t), An(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ N(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && ye();
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
					r.set(t, e), Lt(l);
				}
			} else P(n, C), Lt(l);
			return !0;
		},
		get(e, n, i) {
			if (n === ae) return t;
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
			if (t === ae) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== C || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ N(i ? zt(e[t]) : C, u)), r.set(t, n)), X(n) === C) ? !1 : i;
		},
		set(e, t, n, o) {
			var s = r.get(t), c = t in e;
			if (i && t === "length") for (var d = n; d < s.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ N(C, u)), r.set(d + "", p)) : P(p, C);
			}
			if (s === void 0) (!c || a(e, t)?.writable) && (s = f(() => /* @__PURE__ */ N(void 0, u)), P(s, zt(n)), r.set(t, s));
			else {
				c = s.v !== C;
				var m = f(() => zt(n));
				P(s, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(o, n), !c) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && P(g, _ + 1);
				}
				Lt(l);
			}
			return !0;
		},
		ownKeys(e) {
			X(l);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== C;
			});
			for (var [n, i] of r) i.v !== C && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			be();
		}
	});
}
var Bt, Vt, Ht, Ut;
function Wt() {
	if (Bt === void 0) {
		Bt = window, Vt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		Ht = a(t, "firstChild").get, Ut = a(t, "nextSibling").get, l(e) && (e[ce] = void 0, e[se] = null, e[le] = void 0, e.__e = void 0), l(n) && (n[ue] = void 0);
	}
}
function F(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function Gt(e) {
	return Ht.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function I(e) {
	return Ut.call(e);
}
function L(e, t) {
	if (!w) return /* @__PURE__ */ Gt(e);
	var n = /* @__PURE__ */ Gt(T);
	if (n === null) n = T.appendChild(F());
	else if (t && n.nodeType !== 3) {
		var r = F();
		return n?.before(r), E(r), r;
	}
	return t && Xt(n), E(n), n;
}
function Kt(e, t = !1) {
	if (!w) {
		var n = /* @__PURE__ */ Gt(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ I(n) : n;
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
	for (var i; t--;) i = r, r = /* @__PURE__ */ I(r);
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
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/effects.js
function Zt(e) {
	W === null && (V === null && ge(e), he()), Cn && me(e);
}
function Qt(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function $t(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= g);
	var r = {
		ctx: O,
		deps: null,
		nodes: null,
		f: e | m | 512,
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
	A?.register_created_effect(r);
	var i = r;
	if (e & 4) bt === null ? wt.ensure().schedule(r) : bt.push(r);
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
	return k(t, p), t.teardown = e, t;
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
	return $t(4 | S, e);
}
function an(e) {
	wt.ensure();
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
	return $t(re | x, e);
}
function cn(e, t = 0) {
	return $t(8 | t, e);
}
function ln(e, t = [], n = [], r = []) {
	tt(r, t, n, (t) => {
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
		e !== null && Xe(() => {
			e.abort(de);
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
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (mn(e.nodes.start, e.nodes.end), n = !0), e.f |= y, fn(e, t && !n), In(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	dn(e), e.f ^= y, e.f |= _;
	var i = e.parent;
	i !== null && i.first !== null && hn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function mn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ I(e);
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
		e.f ^= g;
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
		e.f ^= g, e.f & 1024 || (k(e, m), wt.ensure().schedule(e));
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
		var i = n === r ? null : /* @__PURE__ */ I(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/legacy.js
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
	if (t & 2 && (e.f &= ~te), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (Mn(a) && ft(a), a.wv > e.wv) return !0;
		}
		t & 512 && j === null && k(e, p);
	}
	return !1;
}
function Nn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(K !== null && K.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Nn(a, t, !1) : t === a && (n ? k(a, m) : a.f & 1024 && k(a, h), Dt(a));
	}
}
function Pn(e) {
	var t = q, n = J, r = Y, i = V, a = K, o = O, s = H, c = kn, l = e.f;
	q = null, J = 0, Y = null, V = l & 96 ? null : e, K = null, Fe(e.ctx), H = !1, kn = ++On, e.ac !== null && (Xe(() => {
		e.ac.abort(de);
	}), e.ac = null);
	try {
		e.f |= ne;
		var u = e.fn, d = u();
		e.f |= v;
		var f = e.deps, p = A?.is_fork;
		if (q !== null) {
			var m;
			if (p || In(e, J), f !== null && J > 0) for (f.length = J + q.length, m = 0; m < q.length; m++) f[J + m] = q[m];
			else e.deps = f = q;
			if (en() && e.f & 512) for (m = J; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && J < f.length && (In(e, J), f.length = J);
		if (Re() && Y !== null && !H && f !== null && !(e.f & 6146)) for (m = 0; m < Y.length; m++) Nn(Y[m], e);
		if (i !== null && i !== e) {
			if (On++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = On;
			if (t !== null) for (let e of t) e.rv = On;
			Y !== null && (r === null ? r = Y : r.push(...Y));
		}
		return e.f & 8388608 && (e.f ^= ie), d;
	} catch (e) {
		return He(e);
	} finally {
		e.f ^= ne, q = t, J = n, Y = r, V = i, K = a, Fe(o), H = s, kn = c;
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
		s.f & 512 && (s.f ^= 512, s.f &= ~te), s.v !== C && Ge(s), s.ac !== null && Xe(() => {
			s.ac.abort(de), s.ac = null, k(s, m);
		}), pt(s), In(s, 0);
	}
}
function In(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) Fn(e, n[r]);
}
function Ln(e) {
	var t = e.f;
	if (!(t & 16384)) {
		k(e, p);
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
			return (!(a.f & 1024) && a.reactions !== null || zn(a)) && (o = dt(a)), jt.set(a, o), o;
		}
		var s = !(a.f & 512) && !H && V !== null && (Sn || !!(V.f & 512)), c = (a.f & v) === 0;
		Mn(a) && (s && (a.f |= 512), ft(a)), s && !c && (mt(a), Rn(a));
	}
	if (j?.has(e)) return j.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function Rn(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (mt(t), Rn(t));
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
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var Vn = ["touchstart", "touchmove"];
function Hn(e) {
	return Vn.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/events.js
var Un = Symbol("events"), Wn = /* @__PURE__ */ new Set(), Gn = /* @__PURE__ */ new Set(), Kn = null;
function qn(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	Kn = e;
	var s = 0, c = Kn === e && e[Un];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[Un] = t;
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
					var h = o[Un]?.[r];
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
			e[Un] = t, delete e.currentTarget, U(d), G(f);
		}
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/reconciler.js
var Jn = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function Yn(e) {
	return Jn?.createHTML(e) ?? e;
}
function Xn(e) {
	var t = Yt("template");
	return t.innerHTML = Yn(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/template.js
function Zn(e, t) {
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
		if (w) return Zn(T, null), T;
		i === void 0 && (i = Xn(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ Gt(i)));
		var t = r || Vt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ Gt(t), s = t.lastChild;
			Zn(o, s);
		} else Zn(t, t);
		return t;
	};
}
function Qn() {
	if (w) return Zn(T, null), T;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = F();
	return e.append(t, n), Zn(t, n), e;
}
function Q(e, t) {
	if (w) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = T), Oe();
		return;
	}
	e !== null && e.before(t);
}
function $(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[ue] ??= e.nodeValue) && (e[ue] = n, e.nodeValue = `${n}`);
}
function $n(e, t) {
	return tr(e, t);
}
var er = /* @__PURE__ */ new Map();
function tr(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	Wt();
	var l = void 0, u = an(() => {
		var s = n ?? t.appendChild(F());
		$e(s, { pending: () => {} }, (t) => {
			Ie({});
			var n = O;
			if (o && (n.c = o), a && (i.$$events = a), w && Zn(t, null), l = e(t, i) || {}, w && (W.nodes.end = T, T === null || T.nodeType !== 8 || T.data !== "]")) throw Te(), Ce;
			Le();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = Hn(r);
					for (let e of [t, document]) {
						var a = er.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), er.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, qn, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(Wn)), Gn.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = er.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, qn), r.delete(e), r.size === 0 && er.delete(n)) : r.set(e, i);
			}
			Gn.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return nr.set(l, u), l;
}
var nr = /* @__PURE__ */ new WeakMap();
function rr(e, t) {
	let n = nr.get(e);
	return n ? (nr.delete(e), n(t)) : Promise.resolve();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var ir = class {
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
		var n = A, r = Jt();
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
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/if.js
function ar(e, t, n = !1) {
	var r;
	w && (r = T, Oe());
	var i = new ir(e), a = n ? b : 0;
	function o(e, t) {
		if (w) {
			var n = je(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Ae();
				E(a), i.anchor = a, De(!1), i.ensure(e, t), De(!0);
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
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/each.js
function or(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		gn(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					sr(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
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
		sr(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function sr(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= ee, bn(a, document.createDocumentFragment())) : B(t[i], n);
	}
}
var cr;
function lr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = w ? E(/* @__PURE__ */ Gt(u)) : u.appendChild(F());
	}
	w && Oe();
	var d = null, f = /* @__PURE__ */ lt(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, dr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= ee, pr(d, null, c)) : vn(d) : gn(d, () => {
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
			w && je(c) === "[!" != (e === 0) && (c = Ae(), E(c), De(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = A, v = Jt(), y = 0; y < e; y += 1) {
				w && T.nodeType === 8 && T.data === "]" && (c = T, t = !0, De(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Ft(S.v, b), S.i && Ft(S.i, y), v && u.unskip_effect(S.e)) : (S = fr(l, h ? c : cr ??= F(), b, x, y, o, n, i), h || (S.e.f |= ee), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = z(() => s(c)) : (d = z(() => s(cr ??= F())), d.f |= ee)), e > r.size && pe("", "", ""), w && e > 0 && E(Ae()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && De(!0), X(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, w && (c = T);
}
function ur(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function dr(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = ur(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (vn(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= ee, _ === l) pr(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), mr(e, d, _), mr(e, _, y), pr(_, y, n), d = _, p = [], m = [], l = ur(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], te = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) pr(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					mr(e, S.prev, te.next), mr(e, d, S), mr(e, te, b), l = b, d = te, --v, p = [], m = [];
				} else u.delete(_), pr(_, l, n), mr(e, _.prev, _.next), mr(e, _, d === null ? e.effect.first : d.next), mr(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = ur(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = ur(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (sr(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var ne = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || ne.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && ne.push(l), l = ur(l.next);
		var re = ne.length;
		if (re > 0) {
			var ie = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < re; v += 1) ne[v].nodes?.a?.measure();
				for (v = 0; v < re; v += 1) ne[v].nodes?.a?.fix();
			}
			or(e, ne, ie);
		}
	}
	o && Ve(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function fr(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Nt(n) : /* @__PURE__ */ Pt(n, !1, !1) : null, l = o & 2 ? Nt(i) : null;
	return {
		v: c,
		i: l,
		e: z(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function pr(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ I(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function mr(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/attributes.js
var hr = [..." 	\n\r\f\xA0\v﻿"];
function gr(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || hr.includes(r[o - 1])) && (s === r.length || hr.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
function _r(e, t = !1) {
	var n = t ? " !important;" : ";", r = "";
	for (var i of Object.keys(e)) {
		var a = e[i];
		a != null && a !== "" && (r += " " + i + ": " + a + n);
	}
	return r;
}
function vr(e) {
	return e[0] !== "-" || e[1] !== "-" ? e.toLowerCase() : e;
}
function yr(e, t) {
	if (t) {
		var n = "", r, i;
		if (Array.isArray(t) ? (r = t[0], i = t[1]) : r = t, e) {
			e = String(e).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
			var a = !1, o = 0, s = !1, c = [];
			r && c.push(...Object.keys(r).map(vr)), i && c.push(...Object.keys(i).map(vr));
			var l = 0, u = -1;
			let t = e.length;
			for (var d = 0; d < t; d++) {
				var f = e[d];
				if (s ? f === "/" && e[d - 1] === "*" && (s = !1) : a ? a === f && (a = !1) : f === "/" && e[d + 1] === "*" ? s = !0 : f === "\"" || f === "'" ? a = f : f === "(" ? o++ : f === ")" && o--, !s && a === !1 && o === 0) {
					if (f === ":" && u === -1) u = d;
					else if (f === ";" || d === t - 1) {
						if (u !== -1) {
							var p = vr(e.substring(l, u).trim());
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
		return r && (n += _r(r)), i && (n += _r(i, !0)), n = n.trim(), n === "" ? null : n;
	}
	return e == null ? null : String(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/class.js
function br(e, t, n, r, i, a) {
	var o = e[ce];
	if (w || o !== n || o === void 0) {
		var s = gr(n, r, a);
		(!w || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[ce] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/style.js
function xr(e, t = {}, n, r) {
	for (var i in n) {
		var a = n[i];
		t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
	}
}
function Sr(e, t, n, r) {
	var i = e[le];
	if (w || i !== t) {
		var a = yr(t, r);
		(!w || a !== e.getAttribute("style")) && (a == null ? e.removeAttribute("style") : e.style.cssText = a), e[le] = t;
	} else r && (Array.isArray(r) ? (xr(e, n?.[0], r[0]), xr(e, n?.[1], r[1], "important")) : xr(e, n, r));
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function Cr(e, t) {
	return e === t || e?.[ae] === t;
}
function wr(e = {}, t, n, r) {
	var i = O.r, a = W;
	return on(() => {
		var o, s;
		return cn(() => {
			o = s, s = r?.() || [], Bn(() => {
				Cr(n(...s), e) || (t(e, ...s), o && Cr(n(...o), e) && t(null, ...o));
			});
		}), () => {
			let r = a;
			for (; r !== i && r.parent !== null && r.parent.f & 33554432;) r = r.parent;
			let o = () => {
				s && Cr(n(...s), e) && t(null, ...s);
			}, c = r.teardown;
			r.teardown = () => {
				o(), c?.();
			};
		};
	}), e;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/props.js
function Tr(e, t, n, r) {
	var i = !0, o = !!(n & 8), s = !!(n & 16), c = r, l = !0, u = void 0, d = () => s && i ? (u ??= /* @__PURE__ */ at(r), X(u)) : (l && (l = !1, c = s ? Bn(r) : r), c);
	let f;
	if (o) {
		var p = ae in e || oe in e;
		f = a(e, t)?.set ?? (p && t in e ? (n) => e[t] = n : void 0);
	}
	var m, h = !1;
	o ? [m, h] = Ye(() => e[t]) : m = e[t], m === void 0 && r !== void 0 && (m = d(), f && (i && ve(t), f(m)));
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
	var v = !1, y = (n & 1 ? at : lt)(() => (v = !1, g()));
	o && X(y);
	var b = W;
	return (function(e, t) {
		if (arguments.length > 0) {
			let n = t ? X(y) : i && o ? zt(e) : e;
			return P(y, n), v = !0, c !== void 0 && (c = n), e;
		}
		return Cn && v || b.f & 16384 ? y.v : X(y);
	});
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region airquality/src/lib.ts
var Er = [
	"var(--color-success)",
	"var(--color-warning)",
	"var(--color-error)",
	"var(--color-accent)"
];
function Dr(e) {
	let t = Or(e) * (Er.length - 1), n = Math.min(Math.floor(t), Er.length - 2), r = (t - n) * 100;
	return `color-mix(in oklab, ${Er[n + 1]} ${r}%, ${Er[n]})`;
}
function Or(e) {
	return Math.min(1, Math.max(0, e));
}
function kr(e) {
	return typeof e != "object" || !e ? {} : e;
}
function Ar(e) {
	return typeof e == "string" ? e : "";
}
function jr(e, t) {
	return typeof e == "number" && e > 0 ? e : t;
}
function Mr(e) {
	return Array.isArray(e) ? e.flatMap(Nr) : [];
}
function Nr(e) {
	let t = kr(e);
	return typeof t.label != "string" || typeof t.index != "number" ? [] : [{
		label: t.label,
		index: t.index
	}];
}
function Pr(e) {
	return Array.isArray(e) ? e.flatMap(Fr) : [];
}
function Fr(e) {
	let t = kr(e);
	return typeof t.label != "string" || typeof t.value != "number" ? [] : [{
		label: t.label,
		value: t.value,
		unit: Ar(t.unit),
		share: Or(jr(t.share, 0))
	}];
}
function Ir(e, t) {
	let n = e.get(t);
	if (n === void 0) throw Error(`views: service "${t}" is not available`);
	return n;
}
//#endregion
//#region airquality/src/AirQualitySummary.svelte
var Lr = /* @__PURE__ */ Z("<div class=\"relative h-2 rounded-full\"><div class=\"absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full\n        border-2 border-base-100 bg-base-content\"></div></div>"), Rr = /* @__PURE__ */ Z("<div class=\"flex flex-1 flex-col justify-between\"><div class=\"text-sm font-medium\">Air Quality</div> <div class=\"text-5xl leading-tight font-light tabular-nums\"> </div> <div class=\"min-w-0\"><div class=\"truncate text-sm text-base-content/90\"> </div> <div class=\"text-xs text-base-content/60\"> </div></div> <!></div>"), zr = /* @__PURE__ */ Z("<div class=\"flex flex-col gap-2\"><div class=\"flex items-start justify-between gap-3\"><div class=\"min-w-0\"><div class=\"text-sm font-medium\">Air Quality</div> <div class=\"text-5xl leading-tight font-light tabular-nums\"> </div></div> <div class=\"flex min-w-0 flex-col items-end text-right\"><div class=\"truncate text-sm font-medium\"> </div> <div class=\"truncate text-sm text-base-content/90\"> </div> <div class=\"text-xs text-base-content/60\"> </div></div></div> <!></div>");
function Br(e, t) {
	Ie(t, !0);
	let n = (e) => {
		var t = Lr();
		Sr(t, "", {}, { background: "linear-gradient(to right, var(--color-success), var(--color-warning),\n      var(--color-error), var(--color-accent))" });
		var n = L(t);
		let r;
		D(t), ln(() => r = Sr(n, "", r, { left: `${X(o) * 100}%` })), Q(e, t);
	}, r = 6e4, i = 60 * r, a = /* @__PURE__ */ N(zt(Date.now())), o = /* @__PURE__ */ ct(() => Or(t.current.index / t.current.max)), s = /* @__PURE__ */ ct(() => c(X(a) - t.current.updatedAt));
	nn(() => {
		let e = setInterval(() => {
			P(a, Date.now(), !0);
		}, 3e4);
		return () => {
			clearInterval(e);
		};
	});
	function c(e) {
		return e < r ? "just now" : e < i ? `${Math.floor(e / r)} minutes ago` : `${Math.floor(e / i)} hours ago`;
	}
	var l = Qn(), u = Kt(l), d = (e) => {
		var r = Rr(), i = R(L(r), 2), a = L(i, !0);
		D(i);
		var o = R(i, 2), c = L(o), l = L(c, !0);
		D(c);
		var u = R(c, 2), d = L(u, !0);
		D(u), D(o);
		var f = R(o, 2);
		n(f), D(r), ln(() => {
			$(a, t.current.index), $(l, t.current.category), $(d, X(s));
		}), Q(e, r);
	}, f = (e) => {
		var r = zr(), i = L(r), a = L(i), o = R(L(a), 2), c = L(o, !0);
		D(o), D(a);
		var l = R(a, 2), u = L(l), d = L(u, !0);
		D(u);
		var f = R(u, 2), p = L(f, !0);
		D(f);
		var m = R(f, 2), h = L(m, !0);
		D(m), D(l), D(i);
		var g = R(i, 2);
		n(g), D(r), ln(() => {
			$(c, t.current.index), $(d, t.current.place), $(p, t.current.category), $(h, X(s));
		}), Q(e, r);
	};
	ar(u, (e) => {
		t.stacked ? e(d) : e(f, -1);
	}), Q(e, l), Le();
}
//#endregion
//#region airquality/src/IndexStrip.svelte
var Vr = /* @__PURE__ */ Z("<div class=\"flex min-w-0 flex-1 flex-col items-center gap-1\"><div class=\"text-xs text-base-content/60\"> </div> <div class=\"flex h-7 w-1.5 items-end rounded-full bg-base-content/15\"><div class=\"w-full rounded-full\"></div></div> <div class=\"text-sm tabular-nums\"> </div></div>"), Hr = /* @__PURE__ */ Z("<div></div>");
function Ur(e, t) {
	Ie(t, !0);
	let n = Tr(t, "class", 3, "");
	function r(e) {
		return Math.max(8, Or(e.index / t.max) * 100);
	}
	var i = Hr();
	lr(i, 21, () => t.hours, (e) => e.label, (e, n) => {
		var i = Vr(), a = L(i), o = L(a, !0);
		D(a);
		var s = R(a, 2), c = L(s);
		let l;
		D(s);
		var u = R(s, 2), d = L(u, !0);
		D(u), D(i), ln((e) => {
			$(o, X(n).label), l = Sr(c, "", l, e), $(d, X(n).index);
		}, [() => ({
			height: `${r(X(n)) ?? ""}%`,
			background: Dr(X(n).index / t.max)
		})]), Q(e, i);
	}), D(i), ln(() => br(i, 1, `flex items-end justify-between gap-1 ${n() ?? ""}`)), Q(e, i), Le();
}
//#endregion
//#region airquality/src/PollutantList.svelte
var Wr = /* @__PURE__ */ Z("<div class=\"flex items-center gap-2\"><div class=\"w-12 shrink-0 truncate text-sm text-base-content/70\"> </div> <div class=\"relative h-1 flex-1 rounded-full bg-base-content/15\"><div class=\"absolute h-1 rounded-full\"></div></div> <div class=\"w-14 shrink-0 text-right text-sm tabular-nums\"> </div></div>"), Gr = /* @__PURE__ */ Z("<div><div class=\"flex items-center gap-2 text-xs text-base-content/50\"><div class=\"flex-1\">Pollutants</div> <div class=\"w-14 shrink-0 text-right\"> </div></div> <!></div>");
function Kr(e, t) {
	Ie(t, !0);
	let n = Tr(t, "class", 3, ""), r = /* @__PURE__ */ ct(() => i(t.pollutants));
	function i(e) {
		return e.length === 0 ? "" : e[0].unit;
	}
	function a(e) {
		return Math.max(3, e.share * 100);
	}
	var o = Gr(), s = L(o), c = R(L(s), 2), l = L(c, !0);
	D(c), D(s), lr(R(s, 2), 17, () => t.pollutants, (e) => e.label, (e, t) => {
		var n = Wr(), r = L(n), i = L(r, !0);
		D(r);
		var o = R(r, 2), s = L(o);
		let c;
		D(o);
		var l = R(o, 2), u = L(l, !0);
		D(l), D(n), ln((e) => {
			$(i, X(t).label), c = Sr(s, "", c, e), $(u, X(t).value);
		}, [() => ({
			width: `${a(X(t)) ?? ""}%`,
			background: Dr(X(t).share)
		})]), Q(e, n);
	}), D(o), ln(() => {
		br(o, 1, `flex flex-col justify-between ${n() ?? ""}`), $(l, X(r));
	}), Q(e, o), Le();
}
//#endregion
//#region airquality/src/AirQuality.svelte
var qr = /* @__PURE__ */ Z("<div class=\"text-sm font-medium\">Air Quality</div> <div class=\"text-xs leading-snug text-base-content/60\">Set <span class=\"font-mono\">airquality.place</span> in the neoshell config.</div>", 1), Jr = /* @__PURE__ */ Z("<!> <!>", 1), Yr = /* @__PURE__ */ Z("<!> <!> <!>", 1), Xr = /* @__PURE__ */ Z("<div class=\"flex h-full w-full flex-col gap-3 rounded-3xl bg-base-300/65 p-4 text-base-content\n    shadow-lg ring-1 ring-base-content/10 backdrop-blur-xl select-none\"><!></div>");
function Zr(e, t) {
	Ie(t, !0);
	let n = /* @__PURE__ */ N(void 0), r = /* @__PURE__ */ N(0), i = /* @__PURE__ */ N(0), a = /* @__PURE__ */ N(null), o = /* @__PURE__ */ ct(() => c(X(r), X(i)));
	nn(() => t.bus.subscribe("airquality.current", (e) => {
		l(kr(e.data));
	})), nn(() => {
		let e = X(n);
		if (e === void 0) return;
		let t = new ResizeObserver(() => s(e));
		return t.observe(e), s(e), () => t.disconnect();
	});
	function s(e) {
		P(r, e.clientWidth, !0), P(i, e.clientHeight, !0);
	}
	function c(e, t) {
		return e < 300 ? "small" : t < 300 ? "medium" : "large";
	}
	function l(e) {
		typeof e.index == "number" && P(a, {
			index: e.index,
			category: Ar(e.category),
			max: jr(e.max, 100),
			place: Ar(e.place),
			updatedAt: jr(e.updatedAt, Date.now()),
			hours: Mr(e.hours),
			pollutants: Pr(e.pollutants)
		}, !0);
	}
	var u = Xr(), d = L(u), f = (e) => {
		var t = qr();
		ke(2), Q(e, t);
	}, p = (e) => {
		Br(e, {
			get current() {
				return X(a);
			},
			stacked: !0
		});
	}, m = (e) => {
		var t = Jr(), n = Kt(t);
		Br(n, {
			get current() {
				return X(a);
			},
			stacked: !1
		}), Ur(R(n, 2), {
			get hours() {
				return X(a).hours;
			},
			get max() {
				return X(a).max;
			},
			class: "mt-auto"
		}), Q(e, t);
	}, h = (e) => {
		var t = Yr(), n = Kt(t);
		Br(n, {
			get current() {
				return X(a);
			},
			stacked: !1
		});
		var r = R(n, 2);
		Ur(r, {
			get hours() {
				return X(a).hours;
			},
			get max() {
				return X(a).max;
			}
		}), Kr(R(r, 2), {
			get pollutants() {
				return X(a).pollutants;
			},
			class: "flex-1"
		}), Q(e, t);
	};
	ar(d, (e) => {
		X(a) === null ? e(f) : X(o) === "small" ? e(p, 1) : X(o) === "medium" ? e(m, 2) : e(h, -1);
	}), D(u), wr(u, (e) => P(n, e), () => X(n)), Q(e, u), Le();
}
//#endregion
//#region airquality/src/views.ts
var Qr = {
	name: "airquality-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = Ir(e, "ui"), n = Ir(e, "bus");
		e.effect(() => ti()), e.effect(() => t.register("airquality.card", $r(Zr, { bus: n })));
	}
};
function $r(e, t) {
	return (n) => {
		let r = $n(e, {
			target: n,
			props: t
		});
		return { dispose() {
			rr(r);
		} };
	};
}
function ei(e) {
	let t = e.indexOf("?");
	return t < 0 ? "" : e.slice(t);
}
function ti() {
	if (ni()) return () => {};
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = `/plugins/airquality/views.css${ei(import.meta.url)}`, document.head.appendChild(e), () => {
		e.remove();
	};
}
function ni() {
	return new URL(import.meta.url).origin !== window.location.origin;
}
//#endregion
export { Qr as default };
