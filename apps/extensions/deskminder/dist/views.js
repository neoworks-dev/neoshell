//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/utils.js
var e = Array.isArray, t = Array.prototype.indexOf, n = Array.prototype.includes, r = Array.from, i = Object.defineProperty, a = Object.getOwnPropertyDescriptor, o = Object.getOwnPropertyDescriptors, s = Object.prototype, c = Array.prototype, l = Object.getPrototypeOf, u = Object.isExtensible;
function d(e) {
	return typeof e == "function";
}
var f = () => {};
function p(e) {
	for (var t = 0; t < e.length; t++) e[t]();
}
function m() {
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
var h = 1 << 24, g = 1024, _ = 2048, v = 4096, y = 8192, b = 16384, x = 32768, S = 1 << 25, ee = 65536, te = 1 << 19, ne = 1 << 20, re = 1 << 25, ie = 65536, ae = 1 << 21, oe = 1 << 22, se = 1 << 23, ce = Symbol("$state"), le = Symbol("legacy props"), ue = Symbol(""), de = Symbol("attributes"), fe = Symbol("class"), pe = Symbol("style"), me = Symbol("text"), he = Symbol("form reset"), ge = new class extends Error {
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
function be(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function xe(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function Se() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Ce(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function we() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Te(e) {
	throw Error("https://svelte.dev/e/props_invalid_value");
}
function Ee() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function De() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function Oe() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function ke() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/constants.js
var Ae = {}, C = Symbol("uninitialized"), je = "http://www.w3.org/1999/xhtml";
function Me() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function Ne(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function Pe() {
	console.warn("https://svelte.dev/e/select_multiple_invalid_value");
}
function Fe() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/hydration.js
var w = !1;
function Ie(e) {
	w = e;
}
var T;
function E(e) {
	if (e === null) throw Ne(), Ae;
	return T = e;
}
function Le() {
	return E(/* @__PURE__ */ fn(T));
}
function D(e) {
	if (w) {
		if (/* @__PURE__ */ fn(T) !== null) throw Ne(), Ae;
		T = e;
	}
}
function O(e = 1) {
	if (w) {
		for (var t = e, n = T; t--;) n = /* @__PURE__ */ fn(n);
		T = n;
	}
}
function Re(e = !0) {
	for (var t = 0, n = T;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ fn(n);
		e && n.remove(), n = i;
	}
}
function ze(e) {
	if (!e || e.nodeType !== 8) throw Ne(), Ae;
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
var k = null;
function Ue(e) {
	k = e;
}
function We(e) {
	return qe("getContext").get(e);
}
function Ge(e) {
	return qe("hasContext").has(e);
}
function A(e, t = !1, n) {
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
function j(e) {
	var t = k, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) Cn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, k = t.p, e ?? {};
}
function Ke() {
	return !0;
}
function qe(e) {
	return k === null && ve(e), k.c ??= new Map(Je(k) || void 0);
}
function Je(e) {
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
var Ye = [];
function Xe() {
	var e = Ye;
	Ye = [], p(e);
}
function Ze(e) {
	if (Ye.length === 0 && !Nt) {
		var t = Ye;
		queueMicrotask(() => {
			t === Ye && Xe();
		});
	}
	Ye.push(e);
}
function Qe() {
	for (; Ye.length > 0;) Xe();
}
function $e(e) {
	var t = W;
	if (t === null) return U.f |= se, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	et(e, t);
}
function et(e, t) {
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
var tt = ~(_ | v | g);
function M(e, t) {
	e.f = e.f & tt | t;
}
function nt(e) {
	e.f & 512 || e.deps === null ? M(e, g) : M(e, v);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/utils.js
function rt(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= ie, rt(t.deps));
}
function it(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), rt(e.deps), M(e, g);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/store.js
var at = !1;
function ot(e) {
	var t = at;
	try {
		return at = !1, [e(), at];
	} finally {
		at = t;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/misc.js
function st(e, t) {
	if (t) {
		let t = document.body;
		e.autofocus = !0, Ze(() => {
			document.activeElement === t && e.focus();
		});
	}
}
var ct = !1;
function lt() {
	ct || (ct = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[he]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function ut(e) {
	var t = U, n = W;
	Kn(null), qn(null);
	try {
		return e();
	} finally {
		Kn(t), qn(n);
	}
}
function dt(e, t, n, r = n) {
	e.addEventListener(t, () => ut(n));
	let i = e[he];
	e[he] = i ? () => {
		i(), r(!0);
	} : () => r(!0), lt();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/reactivity/create-subscriber.js
function ft(e) {
	let t = 0, n = Xt(0), r;
	return () => {
		bn() && (q(n), Dn(() => (t === 0 && (r = fr(() => e(() => en(n)))), t += 1, () => {
			Ze(() => {
				--t, t === 0 && (r?.(), r = void 0, en(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var pt = ee | te;
function mt(e, t, n, r) {
	new ht(e, t, n, r);
}
var ht = class {
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
	#h = ft(() => (this.#m = Xt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = kn(() => {
			if (w) {
				let e = this.#t;
				Le();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, pt), w && (this.#e = T);
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
		Ze(r), t && (this.#s = V(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				Fe();
				return;
			}
			t = !0, n && ke(), this.#s !== null && In(this.#s, () => {
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
					et(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = V(() => e(this.#e)), Ze(() => {
			var e = this.#c = document.createDocumentFragment(), t = L();
			e.append(t), this.#a = this.#S(() => V(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, In(this.#o, () => {
				this.#o = null;
			}), this.#x(P));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = V(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				Bn(this.#a, e);
				let t = this.#n.pending;
				this.#o = V(() => t(this.#e));
			} else this.#x(P);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		it(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = U, r = k;
		qn(this.#i), Kn(this.#i), Ue(this.#i.ctx);
		try {
			return zt.ensure(), e();
		} catch (e) {
			return $e(e), null;
		} finally {
			qn(t), Kn(n), Ue(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && In(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, Ze(() => {
			this.#d = !1, this.#m && Qt(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), q(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		P?.is_fork ? (this.#a && P.skip_effect(this.#a), this.#o && P.skip_effect(this.#o), this.#s && P.skip_effect(this.#s), P.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (H(this.#a), null), this.#o &&= (H(this.#o), null), this.#s &&= (H(this.#s), null), w && (E(this.#t), O(), E(Re()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return V(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return et(e, this.#i.parent), null;
				}
			}));
		};
		Ze(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				et(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => et(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/async.js
function gt(e, t, n, r) {
	let i = Ke() ? bt : Ct;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = _t(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				et(e, s);
			}
			vt();
		}
	}
	var d = yt();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ St(e))).then(u).catch((e) => et(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), vt();
	}) : f();
}
function _t() {
	var e = W, t = U, n = k, r = P;
	return function(i = !0) {
		qn(e), Kn(t), Ue(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function vt(e = !0) {
	qn(null), Kn(null), Ue(null), e && P?.deactivate();
}
function yt() {
	var e = W, t = e.b, n = P, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function bt(e) {
	var t = 2 | _;
	return W !== null && (W.f |= te), {
		ctx: k,
		deps: null,
		effects: null,
		equals: Be,
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
var xt = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function St(e, t, n) {
	let r = W;
	r === null && ye();
	var i = void 0, a = Xt(C), o = !U, s = /* @__PURE__ */ new Set();
	return En(() => {
		var t = W, n = m();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== ge && n.reject(e);
			}).finally(vt);
		} catch (e) {
			n.reject(e), vt();
		}
		var c = P;
		if (o) {
			if (t.f & 32768) var l = yt();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(xt);
			else for (let e of s.values()) e.reject(xt);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== xt && (c.activate(), t ? (a.f |= se, Qt(a, t)) : (a.f & 8388608 && (a.f ^= se), Qt(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), xn(() => {
		for (let e of s) e.reject(xt);
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
function N(e) {
	let t = /* @__PURE__ */ bt(e);
	return Yn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function Ct(e) {
	let t = /* @__PURE__ */ bt(e);
	return t.equals = He, t;
}
function wt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) H(t[n]);
	}
}
function Tt(e) {
	var t, n = W, r = e.parent;
	if (!Un && r !== null && e.v !== C && r.f & 24576) return Me(), e.v;
	qn(r);
	try {
		e.f &= ~ie, wt(e), t = ar(e);
	} finally {
		qn(n);
	}
	return t;
}
function Et(e) {
	var t = Tt(e);
	if (!e.equals(t) && (e.wv = nr(), (!P?.is_fork || e.deps === null) && (P === null ? e.v = t : (P.capture(e, t, !0), At?.capture(e, t, !0)), e.deps === null))) {
		M(e, g);
		return;
	}
	Un || (jt === null ? nt(e) : (bn() || P?.is_fork) && jt.set(e, t));
}
function Dt(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && ut(() => {
		t.ac.abort(ge), t.ac = null;
	}), t.fn !== null && (t.teardown = f), sr(t, 0), Mn(t));
}
function Ot(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && cr(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/batch.js
var kt = null, P = null, At = null, jt = null, Mt = null, Nt = !1, Pt = !1, Ft = null, It = null, Lt = 0, Rt = 1, zt = class e {
	id = Rt++;
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
		kt === null ? kt = this : (kt.#n = this, this.#t = kt), kt = this;
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
			for (var r of n.d) M(r, _), t(r);
			for (r of n.m) M(r, v), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		this.#e = !0, Lt++ > 1e3 && (this.#x(), Vt());
		for (let e of this.#u) this.#d.delete(e), M(e, _), this.schedule(e);
		for (let e of this.#d) M(e, v), this.schedule(e);
		let t = this.#c;
		this.#c = [], this.apply();
		var n = Ft = [], r = [], i = It = [];
		for (let e of t) try {
			this.#_(e, n, r);
		} catch (t) {
			throw Kt(e), this.#h() || this.discard(), t;
		}
		if (P = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (Ft = null, It = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) Gt(e, t);
			i.length > 0 && P.#g();
			return;
		}
		let o = this.#v();
		if (o) {
			this.#b(r), this.#b(n), o.#y(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), At = this, Ut(r), Ut(n), At = null, this.#s?.resolve();
		var s = P;
		if (this.#a === 0 && (this.#c.length === 0 || s !== null) && this.#x(), this.#c.length > 0) {
			if (s !== null) {
				let e = s;
				e.#c.push(...this.#c.filter((t) => !e.#c.includes(t)));
			} else s = this;
		}
		s !== null && s.#g();
	}
	#_(e, t, n) {
		e.f ^= g;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= g : i & 4 ? t.push(r) : rr(r) && (i & 16 && this.#d.add(r), cr(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), M(i, _), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#x(), P = this, this.#g();
	}
	#b(e) {
		for (var t = 0; t < e.length; t += 1) it(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== C && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), jt?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		P = this;
	}
	deactivate() {
		P = null, jt = null;
	}
	flush() {
		try {
			Pt = !0, P = this, this.#g();
		} finally {
			Lt = 0, Mt = null, Ft = null, It = null, Pt = !1, P = null, jt = null, Jt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(xt);
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
		this.#m || (this.#m = !0, Ze(() => {
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
		return (this.#s ??= m()).promise;
	}
	static ensure() {
		if (P === null) {
			let t = P = new e();
			!Pt && !Nt && Ze(() => {
				t.#e || t.flush();
			});
		}
		return P;
	}
	apply() {
		jt = null;
	}
	schedule(e) {
		if (Mt = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		for (var t = e; t.parent !== null;) {
			t = t.parent;
			var n = t.f;
			if (Ft !== null && t === W && (U === null || !(U.f & 2))) return;
			if (n & 96) {
				if (!(n & 1024)) return;
				t.f ^= g;
			}
		}
		this.#c.push(t);
	}
	#x() {
		if (this.linked) {
			var e = this.#t, t = this.#n;
			e === null || (e.#n = t), t === null ? kt = e : t.#t = e, this.linked = !1;
		}
	}
};
function Bt(e) {
	var t = Nt;
	Nt = !0;
	try {
		var n;
		for (e && (P !== null && !P.is_fork && P.flush(), n = e());;) {
			if (Qe(), P === null) return n;
			P.flush();
		}
	} finally {
		Nt = t;
	}
}
function Vt() {
	try {
		we();
	} catch (e) {
		et(e, Mt);
	}
}
var Ht = null;
function Ut(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && rr(r) && (Ht = /* @__PURE__ */ new Set(), cr(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && Fn(r), Ht?.size > 0)) {
				Jt.clear();
				for (let e of Ht) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) Ht.has(n) && (Ht.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || cr(n);
					}
				}
				Ht.clear();
			}
		}
		Ht = null;
	}
}
function Wt(e) {
	P.schedule(e);
}
function Gt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), M(e, g);
		for (var n = e.first; n !== null;) Gt(n, t), n = n.next;
	}
}
function Kt(e) {
	M(e, g);
	for (var t = e.first; t !== null;) Kt(t), t = t.next;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/sources.js
var qt = /* @__PURE__ */ new Set(), Jt = /* @__PURE__ */ new Map(), Yt = !1;
function Xt(e, t) {
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
function F(e, t) {
	let n = Xt(e, t);
	return Yn(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function Zt(e, t = !1, n = !0) {
	let r = Xt(e);
	return t || (r.equals = He), r;
}
function I(e, t, n = !1) {
	return U !== null && (!Gn || U.f & 131072) && Ke() && U.f & 4325394 && (Jn === null || !Jn.has(e)) && Oe(), Qt(e, n ? nn(t) : t, It);
}
function Qt(e, t, n = null) {
	if (!e.equals(t)) {
		Jt.set(e, Un ? t : e.v);
		var r = zt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && Tt(t), jt === null && nt(t);
		}
		e.wv = nr(), tn(e, _, n), Ke() && W !== null && W.f & 1024 && !(W.f & 96) && (Xn === null ? Zn([e]) : Xn.push(e)), !r.is_fork && qt.size > 0 && !Yt && $t();
	}
	return t;
}
function $t() {
	Yt = !1;
	for (let e of qt) {
		e.f & 1024 && M(e, v);
		let t;
		try {
			t = rr(e);
		} catch {
			t = !0;
		}
		t && cr(e);
	}
	qt.clear();
}
function en(e) {
	I(e, e.v + 1);
}
function tn(e, t, n) {
	var r = e.reactions;
	if (r !== null) for (var i = Ke(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === W)) {
			var l = (c & _) === 0;
			if (l && M(s, t), c & 131072) qt.add(s);
			else if (c & 2) {
				var u = s;
				jt?.delete(u), c & 65536 || (c & 512 && (W === null || !(W.f & 2097152)) && (s.f |= ie), tn(u, v, n));
			} else if (l) {
				var d = s;
				c & 16 && Ht !== null && Ht.add(d), n === null ? Wt(d) : n.push(d);
			}
		}
	}
}
function nn(t) {
	if (typeof t != "object" || !t || ce in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ F(0), u = null, d = er, f = (e) => {
		if (er === d) return e();
		var t = U, n = er;
		Kn(null), tr(d);
		var r = e();
		return Kn(t), tr(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ F(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && Ee();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ F(n.value, u);
				return r.set(t, e), e;
			}) : I(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ F(C, u));
					r.set(t, e), en(o);
				}
			} else I(n, C), en(o);
			return !0;
		},
		get(e, n, i) {
			if (n === ce) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ F(nn(s ? e[n] : C), u)), r.set(n, o)), o !== void 0) {
				var c = q(o);
				return c === C ? void 0 : c;
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
			if (t === ce) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== C || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ F(i ? nn(e[t]) : C, u)), r.set(t, n)), q(n) === C) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ F(C, u)), r.set(d + "", p)) : I(p, C);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ F(void 0, u)), I(c, nn(n)), r.set(t, c));
			else {
				l = c.v !== C;
				var m = f(() => nn(n));
				I(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && I(g, _ + 1);
				}
				en(o);
			}
			return !0;
		},
		ownKeys(e) {
			q(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== C;
			});
			for (var [n, i] of r) i.v !== C && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			De();
		}
	});
}
function rn(e) {
	try {
		if (typeof e == "object" && e && ce in e) return e[ce];
	} catch {}
	return e;
}
function an(e, t) {
	return Object.is(rn(e), rn(t));
}
var on, sn, cn, ln;
function un() {
	if (on === void 0) {
		on = window, sn = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		cn = a(t, "firstChild").get, ln = a(t, "nextSibling").get, u(e) && (e[fe] = void 0, e[de] = null, e[pe] = void 0, e.__e = void 0), u(n) && (n[me] = void 0);
	}
}
function L(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function dn(e) {
	return cn.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function fn(e) {
	return ln.call(e);
}
function R(e, t) {
	if (!w) return /* @__PURE__ */ dn(e);
	var n = /* @__PURE__ */ dn(T);
	if (n === null) n = T.appendChild(L());
	else if (t && n.nodeType !== 3) {
		var r = L();
		return n?.before(r), E(r), r;
	}
	return t && gn(n), E(n), n;
}
function z(e, t = !1) {
	if (!w) {
		var n = /* @__PURE__ */ dn(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ fn(n) : n;
	}
	if (t) {
		if (T?.nodeType !== 3) {
			var r = L();
			return T?.before(r), E(r), r;
		}
		gn(T);
	}
	return T;
}
function B(e, t = 1, n = !1) {
	let r = w ? T : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ fn(r);
	if (!w) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = L();
			return r === null ? i?.after(a) : r.before(a), E(a), a;
		}
		gn(r);
	}
	return E(r), r;
}
function pn(e) {
	e.textContent = "";
}
function mn() {
	return !1;
}
function hn(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function gn(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/effects.js
function _n(e) {
	W === null && (U === null && Ce(e), Se()), Un && xe(e);
}
function vn(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function yn(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= y);
	var r = {
		ctx: k,
		deps: null,
		nodes: null,
		f: e | _ | 512,
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
	P?.register_created_effect(r);
	var i = r;
	if (e & 4) Ft === null ? zt.ensure().schedule(r) : Ft.push(r);
	else if (t !== null) {
		try {
			cr(r);
		} catch (e) {
			throw H(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= ee));
	}
	if (i !== null && (i.parent = n, n !== null && vn(i, n), U !== null && U.f & 2 && !(e & 64))) {
		var a = U;
		(a.effects ??= []).push(i);
	}
	return r;
}
function bn() {
	return U !== null && !Gn;
}
function xn(e) {
	let t = yn(8, null);
	return M(t, g), t.teardown = e, t;
}
function Sn(e) {
	_n("$effect");
	var t = W.f;
	if (!U && t & 32 && k !== null && !k.i) {
		var n = k;
		(n.e ??= []).push(e);
	} else return Cn(e);
}
function Cn(e) {
	return yn(4 | ne, e);
}
function wn(e) {
	zt.ensure();
	let t = yn(64 | te, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? In(t, () => {
			H(t), n(void 0);
		}) : (H(t), n(void 0));
	});
}
function Tn(e) {
	return yn(4, e);
}
function En(e) {
	return yn(oe | te, e);
}
function Dn(e, t = 0) {
	return yn(8 | t, e);
}
function On(e, t = [], n = [], r = []) {
	gt(r, t, n, (t) => {
		yn(8, () => {
			e(...t.map(q));
		});
	});
}
function kn(e, t = 0) {
	return yn(16 | t, e);
}
function An(e, t = 0) {
	return yn(h | t, e);
}
function V(e) {
	return yn(32 | te, e);
}
function jn(e) {
	var t = e.teardown;
	if (t !== null) {
		let e = Un, n = U;
		Wn(!0), Kn(null);
		try {
			t.call(null);
		} finally {
			Wn(e), Kn(n);
		}
	}
}
function Mn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && ut(() => {
			e.abort(ge);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : H(n, t), n = r;
	}
}
function Nn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || H(t), t = n;
	}
}
function H(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (Pn(e.nodes.start, e.nodes.end), n = !0), e.f |= S, Mn(e, t && !n), sr(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	jn(e), e.f ^= S, e.f |= b;
	var i = e.parent;
	i !== null && i.first !== null && Fn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function Pn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ fn(e);
		e.remove(), e = n;
	}
}
function Fn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function In(e, t, n = !0) {
	var r = [];
	Ln(e, r, !0);
	var i = () => {
		n && H(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function Ln(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= y;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				Ln(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function Rn(e) {
	zn(e, !0);
}
function zn(e, t) {
	if (e.f & 8192) {
		e.f ^= y, e.f & 1024 || (M(e, _), zt.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			zn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function Bn(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ fn(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/legacy.js
var Vn = null, Hn = !1, Un = !1;
function Wn(e) {
	Un = e;
}
var U = null, Gn = !1;
function Kn(e) {
	U = e;
}
var W = null;
function qn(e) {
	W = e;
}
var Jn = null;
function Yn(e) {
	U !== null && (Jn ??= /* @__PURE__ */ new Set()).add(e);
}
var G = null, K = 0, Xn = null;
function Zn(e) {
	Xn = e;
}
var Qn = 1, $n = 0, er = $n;
function tr(e) {
	er = e;
}
function nr() {
	return ++Qn;
}
function rr(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 2 && (e.f &= ~ie), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (rr(a) && Et(a), a.wv > e.wv) return !0;
		}
		t & 512 && jt === null && M(e, g);
	}
	return !1;
}
function ir(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(Jn !== null && Jn.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? ir(a, t, !1) : t === a && (n ? M(a, _) : a.f & 1024 && M(a, v), Wt(a));
	}
}
function ar(e) {
	var t = G, n = K, r = Xn, i = U, a = Jn, o = k, s = Gn, c = er, l = e.f;
	G = null, K = 0, Xn = null, U = l & 96 ? null : e, Jn = null, Ue(e.ctx), Gn = !1, er = ++$n, e.ac !== null && (ut(() => {
		e.ac.abort(ge);
	}), e.ac = null);
	try {
		e.f |= ae;
		var u = e.fn, d = u();
		e.f |= x;
		var f = e.deps, p = P?.is_fork;
		if (G !== null) {
			var m;
			if (p || sr(e, K), f !== null && K > 0) for (f.length = K + G.length, m = 0; m < G.length; m++) f[K + m] = G[m];
			else e.deps = f = G;
			if (bn() && e.f & 512) for (m = K; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && K < f.length && (sr(e, K), f.length = K);
		if (Ke() && Xn !== null && !Gn && f !== null && !(e.f & 6146)) for (m = 0; m < Xn.length; m++) ir(Xn[m], e);
		if (i !== null && i !== e) {
			if ($n++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = $n;
			if (t !== null) for (let e of t) e.rv = $n;
			Xn !== null && (r === null ? r = Xn : r.push(...Xn));
		}
		return e.f & 8388608 && (e.f ^= se), d;
	} catch (e) {
		return $e(e);
	} finally {
		e.f ^= ae, G = t, K = n, Xn = r, U = i, Jn = a, Ue(o), Gn = s, er = c;
	}
}
function or(e, r) {
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
		s.f & 512 && (s.f ^= 512, s.f &= ~ie), s.v !== C && nt(s), s.ac !== null && ut(() => {
			s.ac.abort(ge), s.ac = null, M(s, _);
		}), Dt(s), sr(s, 0);
	}
}
function sr(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) or(e, n[r]);
}
function cr(e) {
	var t = e.f;
	if (!(t & 16384)) {
		M(e, g);
		var n = W, r = Hn;
		W = e, Hn = !(t & 96);
		try {
			t & 16777232 ? Nn(e) : Mn(e), jn(e);
			var i = ar(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = Qn;
		} finally {
			Hn = r, W = n;
		}
	}
}
async function lr() {
	await Promise.resolve(), Bt();
}
function q(e) {
	var t = !!(e.f & 2);
	if (Vn?.add(e), U !== null && !Gn && !(W !== null && W.f & 16384) && (Jn === null || !Jn.has(e))) {
		var r = U.deps;
		if (U.f & 2097152) e.rv < $n && (e.rv = $n, G === null && r !== null && r[K] === e ? K++ : G === null ? G = [e] : G.push(e));
		else {
			U.deps ??= [], n.call(U.deps, e) || U.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [U] : n.call(i, U) || i.push(U);
		}
	}
	if (Un && Jt.has(e)) return Jt.get(e);
	if (t) {
		var a = e;
		if (Un) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || dr(a)) && (o = Tt(a)), Jt.set(a, o), o;
		}
		var s = !(a.f & 512) && !Gn && U !== null && (Hn || !!(U.f & 512)), c = (a.f & x) === 0;
		rr(a) && (s && (a.f |= 512), Et(a)), s && !c && (Ot(a), ur(a));
	}
	if (jt?.has(e)) return jt.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function ur(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (Ot(t), ur(t));
}
function dr(e) {
	if (e.v === C) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (Jt.has(t) || t.f & 2 && dr(t)) return !0;
	return !1;
}
function fr(e) {
	var t = Gn;
	try {
		return Gn = !0, e();
	} finally {
		Gn = t;
	}
}
function pr(e) {
	if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
		if (ce in e) mr(e);
		else if (!Array.isArray(e)) for (let t in e) {
			let n = e[t];
			typeof n == "object" && n && ce in n && mr(n);
		}
	}
}
function mr(e, t = /* @__PURE__ */ new Set()) {
	if (typeof e == "object" && e && !(e instanceof EventTarget) && !t.has(e)) {
		t.add(e), e instanceof Date && e.getTime();
		for (let n in e) try {
			mr(e[n], t);
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
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/utils.js
function hr(e) {
	return e.endsWith("capture") && e !== "gotpointercapture" && e !== "lostpointercapture";
}
var gr = [
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
function _r(e) {
	return gr.includes(e);
}
var vr = /* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split("."), yr = {
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
function br(e) {
	return e = e.toLowerCase(), yr[e] ?? e;
}
[...vr];
var xr = ["touchstart", "touchmove"];
function Sr(e) {
	return xr.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/events.js
var Cr = Symbol("events"), wr = /* @__PURE__ */ new Set(), Tr = /* @__PURE__ */ new Set();
function Er(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || Ar.call(t, e), !e.cancelBubble) return ut(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? Ze(() => {
		t.addEventListener(e, i, r);
	}) : t.addEventListener(e, i, r), i;
}
function Dr(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = Er(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && xn(() => {
		t.removeEventListener(e, o, a);
	});
}
function J(e, t, n) {
	(t[Cr] ??= {})[e] = n;
}
function Or(e) {
	for (var t = 0; t < e.length; t++) wr.add(e[t]);
	for (var n of Tr) n(e);
}
var kr = null;
function Ar(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	kr = e;
	var s = 0, c = kr === e && e[Cr];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[Cr] = t;
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
		Kn(null), qn(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[Cr]?.[r];
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
			e[Cr] = t, delete e.currentTarget, Kn(d), qn(f);
		}
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/reconciler.js
var jr = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function Mr(e) {
	return jr?.createHTML(e) ?? e;
}
function Nr(e) {
	var t = hn("template");
	return t.innerHTML = Mr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/template.js
function Pr(e, t) {
	var n = W;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function Fr(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (w) return Pr(T, null), T;
		i === void 0 && (i = Nr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ dn(i)));
		var t = r || sn ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ dn(t), s = t.lastChild;
			Pr(o, s);
		} else Pr(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function Ir(e, t, n = "svg") {
	var r = !e.startsWith("<!>"), i = !!(t & 1), a = `<${n}>${r ? e : "<!>" + e}</${n}>`, o;
	return () => {
		if (w) return Pr(T, null), T;
		if (!o) {
			var e = /* @__PURE__ */ dn(Nr(a));
			if (i) for (o = document.createDocumentFragment(); /* @__PURE__ */ dn(e);) o.appendChild(/* @__PURE__ */ dn(e));
			else o = /* @__PURE__ */ dn(e);
		}
		var t = o.cloneNode(!0);
		if (i) {
			var n = /* @__PURE__ */ dn(t), r = t.lastChild;
			Pr(n, r);
		} else Pr(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function Y(e, t) {
	return /* @__PURE__ */ Ir(e, t, "svg");
}
function Lr(e = "") {
	if (!w) {
		var t = L(e + "");
		return Pr(t, t), t;
	}
	var n = T;
	return n.nodeType === 3 ? gn(n) : (n.before(n = L()), E(n)), Pr(n, n), n;
}
function Rr() {
	if (w) return Pr(T, null), T;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = L();
	return e.append(t, n), Pr(t, n), e;
}
function X(e, t) {
	if (w) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = T), Le();
		return;
	}
	e !== null && e.before(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/render.js
var zr = !0;
function Br(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[me] ??= e.nodeValue) && (e[me] = n, e.nodeValue = `${n}`);
}
function Vr(e, t) {
	return Ur(e, t);
}
var Hr = /* @__PURE__ */ new Map();
function Ur(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	un();
	var l = void 0, u = wn(() => {
		var u = n ?? t.appendChild(L());
		mt(u, { pending: () => {} }, (t) => {
			A({});
			var n = k;
			if (o && (n.c = o), a && (i.$$events = a), w && Pr(t, null), zr = s, l = e(t, i) || {}, zr = !0, w && (W.nodes.end = T, T === null || T.nodeType !== 8 || T.data !== "]")) throw Ne(), Ae;
			j();
		}, c);
		var d = /* @__PURE__ */ new Set(), f = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!d.has(r)) {
					d.add(r);
					var i = Sr(r);
					for (let e of [t, document]) {
						var a = Hr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), Hr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, Ar, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return f(r(wr)), Tr.add(f), () => {
			for (var e of d) for (let n of [t, document]) {
				var r = Hr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, Ar), r.delete(e), r.size === 0 && Hr.delete(n)) : r.set(e, i);
			}
			Tr.delete(f), u !== n && u.parentNode?.removeChild(u);
		};
	});
	return Wr.set(l, u), l;
}
var Wr = /* @__PURE__ */ new WeakMap();
function Gr(e, t) {
	let n = Wr.get(e);
	return n ? (Wr.delete(e), n(t)) : Promise.resolve();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var Kr = class {
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
			if (n) Rn(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (Rn(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
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
						Bn(r, t), t.append(L()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else H(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), In(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (H(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = P, r = mn();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = L();
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
		} else w && (this.anchor = T), this.#a(n);
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/if.js
function Z(e, t, n = !1) {
	var r;
	w && (r = T, Le());
	var i = new Kr(e), a = n ? ee : 0;
	function o(e, t) {
		if (w) {
			var n = ze(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Re();
				E(a), i.anchor = a, Ie(!1), i.ensure(e, t), Ie(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	kn(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/each.js
function qr(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		In(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					Jr(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = i.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			pn(d), d.append(u), e.items.clear();
		}
		Jr(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function Jr(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= re, Bn(a, document.createDocumentFragment())) : H(t[i], n);
	}
}
var Yr;
function Xr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = w ? E(/* @__PURE__ */ dn(u)) : u.appendChild(L());
	}
	w && Le();
	var d = null, f = /* @__PURE__ */ Ct(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, Qr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= re, ei(d, null, c)) : Rn(d) : In(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: kn(() => {
			p = q(f);
			var e = p.length;
			let t = !1;
			w && ze(c) === "[!" != (e === 0) && (c = Re(), E(c), Ie(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = P, v = mn(), y = 0; y < e; y += 1) {
				w && T.nodeType === 8 && T.data === "]" && (c = T, t = !0, Ie(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Qt(S.v, b), S.i && Qt(S.i, y), v && u.unskip_effect(S.e)) : (S = $r(l, h ? c : Yr ??= L(), b, x, y, o, n, i), h || (S.e.f |= re), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = V(() => s(c)) : (d = V(() => s(Yr ??= L())), d.f |= re)), e > r.size && be("", "", ""), w && e > 0 && E(Re()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && Ie(!0), q(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, w && (c = T);
}
function Zr(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function Qr(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = Zr(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (Rn(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= re, _ === l) ei(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), ti(e, d, _), ti(e, _, y), ei(_, y, n), d = _, p = [], m = [], l = Zr(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], ee = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) ei(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					ti(e, S.prev, ee.next), ti(e, d, S), ti(e, ee, b), l = b, d = ee, --v, p = [], m = [];
				} else u.delete(_), ei(_, l, n), ti(e, _.prev, _.next), ti(e, _, d === null ? e.effect.first : d.next), ti(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = Zr(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = Zr(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (Jr(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var te = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || te.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && te.push(l), l = Zr(l.next);
		var ne = te.length;
		if (ne > 0) {
			var ie = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < ne; v += 1) te[v].nodes?.a?.measure();
				for (v = 0; v < ne; v += 1) te[v].nodes?.a?.fix();
			}
			qr(e, te, ie);
		}
	}
	o && Ze(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function $r(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Xt(n) : /* @__PURE__ */ Zt(n, !1, !1) : null, l = o & 2 ? Xt(i) : null;
	return {
		v: c,
		i: l,
		e: V(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function ei(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ fn(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function ti(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/snippet.js
function ni(e, t, ...n) {
	var r = new Kr(e);
	kn(() => {
		let e = t() ?? null;
		r.ensure(e, e && ((t) => e(t, ...n)));
	}, ee);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/timing.js
var ri = () => performance.now(), ii = {
	tick: (e) => requestAnimationFrame(e),
	now: () => ri(),
	tasks: /* @__PURE__ */ new Set()
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/loop.js
function ai() {
	let e = ii.now();
	ii.tasks.forEach((t) => {
		t.c(e) || (ii.tasks.delete(t), t.f());
	}), ii.tasks.size !== 0 && ii.tick(ai);
}
function oi(e) {
	let t;
	return ii.tasks.size === 0 && ii.tick(ai), {
		promise: new Promise((n) => {
			ii.tasks.add(t = {
				c: e,
				f: n
			});
		}),
		abort() {
			ii.tasks.delete(t);
		}
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/transitions.js
function si(e, t) {
	ut(() => {
		e.dispatchEvent(new CustomEvent(t));
	});
}
function ci(e) {
	if (e === "float") return "cssFloat";
	if (e === "offset") return "cssOffset";
	if (e.startsWith("--")) return e;
	let t = e.split("-");
	return t.length === 1 ? t[0] : t[0] + t.slice(1).map((e) => e[0].toUpperCase() + e.slice(1)).join("");
}
function li(e) {
	let t = {}, n = e.split(";");
	for (let e of n) {
		let [n, r] = e.split(":");
		if (!n || r === void 0) break;
		let i = ci(n.trim());
		t[i] = r.trim();
	}
	return t;
}
var ui = (e) => e;
function di(e, t, n, r) {
	var i = !!(e & 1), a = !!(e & 2), o = i && a, s = !!(e & 4), c = o ? "both" : i ? "in" : "out", l, u = t.inert, d = t.style.overflow, f, p;
	function m() {
		return ut(() => l ??= n()(t, r?.() ?? {}, { direction: c }));
	}
	var h = {
		is_global: s,
		in() {
			if (t.inert = u, !i) {
				p?.abort(), p?.reset?.();
				return;
			}
			a || f?.abort(), f = fi(t, m(), p, 1, () => {
				si(t, "introstart");
			}, () => {
				si(t, "introend"), f?.abort(), f = l = void 0, t.style.overflow = d;
			});
		},
		out(e) {
			if (!a) {
				e?.(), l = void 0;
				return;
			}
			t.inert = !0, p = fi(t, m(), f, 0, () => {
				si(t, "outrostart");
			}, () => {
				si(t, "outroend"), e?.();
			});
		},
		stop: () => {
			f?.abort(), p?.abort();
		}
	}, g = W;
	if ((g.nodes.t ??= []).push(h), i && zr) {
		var _ = s;
		if (!_) {
			for (var v = g.parent; v && v.f & 65536;) for (; (v = v.parent) && !(v.f & 16););
			_ = !v || !!(v.f & 32768);
		}
		_ && Tn(() => {
			fr(() => h.in());
		});
	}
}
function fi(e, t, n, r, i, a) {
	var o = r === 1;
	if (d(t)) {
		var s, c = !1;
		return Ze(() => {
			c || (s = fi(e, t({ direction: o ? "in" : "out" }), n, r, i, a));
		}), {
			abort: () => {
				c = !0, s?.abort();
			},
			deactivate: () => s.deactivate(),
			reset: () => s.reset(),
			t: () => s.t()
		};
	}
	if (n?.deactivate(), !t?.duration && !t?.delay) return i(), a(), {
		abort: f,
		deactivate: f,
		reset: f,
		t: () => r
	};
	let { delay: l = 0, css: u, tick: p, easing: m = ui } = t;
	var h = [];
	if (o && n === void 0 && (p && p(0, 1), u)) {
		var g = li(u(0, 1));
		h.push(g, g);
	}
	var _ = () => 1 - r, v = e.animate(h, {
		duration: l,
		fill: "forwards"
	});
	return v.onfinish = () => {
		v.cancel(), i();
		var o = n?.t() ?? 1 - r;
		n?.abort();
		var s = r - o, c = t.duration * Math.abs(s), l = [];
		if (c > 0) {
			var d = !1;
			if (u) for (var f = Math.ceil(c / (1e3 / 60)), h = 0; h <= f; h += 1) {
				var g = o + s * m(h / f), y = li(u(g, 1 - g));
				l.push(y), d ||= y.overflow === "hidden";
			}
			d && (e.style.overflow = "hidden"), _ = () => {
				var e = v.currentTime;
				return o + s * m(e / c);
			}, p && oi(() => {
				if (v.playState !== "running") return !1;
				var e = _();
				return p(e, 1 - e), !0;
			});
		}
		v = e.animate(l, {
			duration: c,
			fill: "forwards"
		}), v.onfinish = () => {
			_ = () => r, p?.(r, 1 - r), a();
		};
	}, {
		abort: () => {
			v && (v.cancel(), v.effect = null, v.onfinish = f);
		},
		deactivate: () => {
			a = f;
		},
		reset: () => {
			r === 0 && p?.(1, 0);
		},
		t: () => _()
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/actions.js
function pi(e, t, n) {
	Tn(() => {
		var r = fr(() => t(e, n?.()) || {});
		if (n && r?.update) {
			var i = !1, a = {};
			Dn(() => {
				var e = n();
				pr(e), i && Ve(a, e) && (a = e, r.update(e));
			}), i = !0;
		}
		if (r?.destroy) return () => r.destroy();
	});
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attachments.js
function mi(e, t) {
	var n = void 0, r;
	An(() => {
		n !== (n = t()) && (r &&= (H(r), null), n && (r = V(() => {
			Tn(() => n(e));
		})));
	});
}
//#endregion
//#region ../../node_modules/.bun/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function hi(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = hi(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function gi() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = hi(e)) && (r && (r += " "), r += t);
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/attributes.js
function _i(e) {
	return typeof e == "object" ? gi(e) : e ?? "";
}
var vi = [..." 	\n\r\f\xA0\v﻿"];
function yi(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || vi.includes(r[o - 1])) && (s === r.length || vi.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
function bi(e, t = !1) {
	var n = t ? " !important;" : ";", r = "";
	for (var i of Object.keys(e)) {
		var a = e[i];
		a != null && a !== "" && (r += " " + i + ": " + a + n);
	}
	return r;
}
function xi(e) {
	return e[0] !== "-" || e[1] !== "-" ? e.toLowerCase() : e;
}
function Si(e, t) {
	if (t) {
		var n = "", r, i;
		if (Array.isArray(t) ? (r = t[0], i = t[1]) : r = t, e) {
			e = String(e).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
			var a = !1, o = 0, s = !1, c = [];
			r && c.push(...Object.keys(r).map(xi)), i && c.push(...Object.keys(i).map(xi));
			var l = 0, u = -1;
			let t = e.length;
			for (var d = 0; d < t; d++) {
				var f = e[d];
				if (s ? f === "/" && e[d - 1] === "*" && (s = !1) : a ? a === f && (a = !1) : f === "/" && e[d + 1] === "*" ? s = !0 : f === "\"" || f === "'" ? a = f : f === "(" ? o++ : f === ")" && o--, !s && a === !1 && o === 0) {
					if (f === ":" && u === -1) u = d;
					else if (f === ";" || d === t - 1) {
						if (u !== -1) {
							var p = xi(e.substring(l, u).trim());
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
		return r && (n += bi(r)), i && (n += bi(i, !0)), n = n.trim(), n === "" ? null : n;
	}
	return e == null ? null : String(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/class.js
function Ci(e, t, n, r, i, a) {
	var o = e[fe];
	if (w || o !== n || o === void 0) {
		var s = yi(n, r, a);
		(!w || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[fe] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/style.js
function wi(e, t = {}, n, r) {
	for (var i in n) {
		var a = n[i];
		t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
	}
}
function Ti(e, t, n, r) {
	var i = e[pe];
	if (w || i !== t) {
		var a = Si(t, r);
		(!w || a !== e.getAttribute("style")) && (a == null ? e.removeAttribute("style") : e.style.cssText = a), e[pe] = t;
	} else r && (Array.isArray(r) ? (wi(e, n?.[0], r[0]), wi(e, n?.[1], r[1], "important")) : wi(e, n, r));
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function Ei(t, n, r = !1) {
	if (t.multiple) {
		if (n == null) return;
		if (!e(n)) return Pe();
		for (var i of t.options) i.selected = n.includes(Oi(i));
		return;
	}
	for (i of t.options) if (an(Oi(i), n)) {
		i.selected = !0;
		return;
	}
	(!r || n !== void 0) && (t.selectedIndex = -1);
}
function Di(e) {
	var t = new MutationObserver(() => {
		"__value" in e && Ei(e, e.__value);
	});
	t.observe(e, {
		childList: !0,
		subtree: !0,
		attributes: !0,
		attributeFilter: ["value"]
	}), xn(() => {
		t.disconnect();
	});
}
function Oi(e) {
	return "__value" in e ? e.__value : e.value;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var ki = Symbol("class"), Ai = Symbol("style"), ji = Symbol("is custom element"), Mi = Symbol("is html"), Ni = _e ? "link" : "LINK", Pi = _e ? "input" : "INPUT", Fi = _e ? "option" : "OPTION", Ii = _e ? "select" : "SELECT";
function Li(e) {
	if (w) {
		var t = !1, n = () => {
			if (!t) {
				if (t = !0, e.hasAttribute("value")) {
					var n = e.value;
					Q(e, "value", null), e.value = n;
				}
				if (e.hasAttribute("checked")) {
					var r = e.checked;
					Q(e, "checked", null), e.checked = r;
				}
			}
		};
		e[he] = n, Ze(n), lt();
	}
}
function Ri(e, t) {
	t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function Q(e, t, n, r) {
	var i = Vi(e);
	w && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Ni) || i[t] !== (i[t] = n) && (t === "loading" && (e[ue] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && Ui(e).includes(t) ? e[t] = n : e.setAttribute(t, n));
}
function zi(e, t, n, r, i = !1, a = !1) {
	if (w && i && e.nodeName === Pi) {
		var o = e;
		(o.type === "checkbox" ? "defaultChecked" : "defaultValue") in n || Li(o);
	}
	var s = Vi(e), c = s[ji], l = !s[Mi];
	let u = w && c;
	u && Ie(!1);
	var d = t || {}, f = e.nodeName === Fi;
	for (var p in t) p in n || (n[p] = null);
	n.class ? n.class = _i(n.class) : (r || n[ki]) && (n.class = null), n[Ai] && (n.style ??= null);
	var m = Ui(e);
	if (e.nodeName === Pi && "type" in n && ("value" in n || "__value" in n)) {
		var h = n.type;
		(h !== d.type || h === void 0 && e.hasAttribute("type")) && (d.type = h, Q(e, "type", h, a));
	}
	for (let i in n) {
		let o = n[i];
		if (f && i === "value" && o == null) {
			e.value = e.__value = "", d[i] = o;
			continue;
		}
		if (i === "class") {
			Ci(e, e.namespaceURI === "http://www.w3.org/1999/xhtml", o, r, t?.[ki], n[ki]), d[i] = o, d[ki] = n[ki];
			continue;
		}
		if (i === "style") {
			Ti(e, o, t?.[Ai], n[Ai]), d[i] = o, d[Ai] = n[Ai];
			continue;
		}
		var g = d[i];
		if (!(o === g && !(o === void 0 && e.hasAttribute(i)))) {
			d[i] = o;
			var _ = i[0] + i[1];
			if (_ !== "$$") {
				if (_ === "on") {
					let t = {}, n = "$$" + i, r = i.slice(2);
					var v = _r(r);
					if (hr(r) && (r = r.slice(0, -7), t.capture = !0), !v && g) {
						if (o != null) continue;
						e.removeEventListener(r, d[n], t), d[n] = null;
					}
					if (v) J(r, e, o), Or([r]);
					else if (o != null) {
						function a(e) {
							d[i].call(this, e);
						}
						d[n] = Er(r, e, a, t);
					}
				} else if (i === "style") Q(e, i, o);
				else if (i === "autofocus") st(e, !!o);
				else if (!c && (i === "__value" || i === "value" && o != null)) e.value = e.__value = o;
				else if (i === "selected" && f) Ri(e, o);
				else {
					var y = i;
					l || (y = br(y));
					var b = y === "defaultValue" || y === "defaultChecked";
					if (o == null && !c && !b) {
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
					} else b || m.includes(y) && (c || typeof o != "string") ? (e[y] = o, y in s && (s[y] = C)) : typeof o != "function" && Q(e, y, o, a);
				}
			}
		}
	}
	return u && Ie(!0), d;
}
function Bi(e, t, n = [], r = [], i = [], a, o = !1, s = !1) {
	gt(i, n, r, (n) => {
		var r = void 0, i = {}, c = e.nodeName === Ii, l = !1;
		if (An(() => {
			var u = t(...n.map(q)), d = zi(e, r, u, a, o, s);
			l && c && "value" in u && Ei(e, u.value);
			for (let e of Object.getOwnPropertySymbols(i)) u[e] || H(i[e]);
			for (let t of Object.getOwnPropertySymbols(u)) {
				var f = u[t];
				t.description === "@attach" && (!r || f !== r[t]) && (i[t] && H(i[t]), i[t] = V(() => mi(e, () => f))), d[t] = f;
			}
			r = d;
		}), c) {
			var u = e;
			Tn(() => {
				Ei(u, r.value, !0), Di(u);
			});
		}
		l = !0;
	});
}
function Vi(e) {
	return e[de] ??= {
		[ji]: e.nodeName.includes("-"),
		[Mi]: e.namespaceURI === je
	};
}
var Hi = /* @__PURE__ */ new Map();
function Ui(e) {
	var t = e.getAttribute("is") || e.nodeName, n = Hi.get(t);
	if (n) return n;
	Hi.set(t, n = []);
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.push(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
function Wi(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet();
	dt(e, "input", async (i) => {
		var a = i ? e.defaultValue : e.value;
		if (a = Gi(e) ? Ki(a) : a, n(a), P !== null && r.add(P), await lr(), a !== (a = t())) {
			var o = e.selectionStart, s = e.selectionEnd, c = e.value.length;
			if (e.value = a ?? "", s !== null) {
				var l = e.value.length;
				o === s && s === c && l > c ? (e.selectionStart = l, e.selectionEnd = l) : (e.selectionStart = o, e.selectionEnd = Math.min(s, l));
			}
		}
	}), (w && e.defaultValue !== e.value || fr(t) == null && e.value) && (n(Gi(e) ? Ki(e.value) : e.value), P !== null && r.add(P)), Dn(() => {
		var n = t();
		if (e === document.activeElement) {
			var i = P;
			if (r.has(i)) return;
		}
		Gi(e) && n === Ki(e.value) || e.type === "date" && !n && !e.value || n !== e.value && (e.value = n ?? "");
	});
}
function Gi(e) {
	var t = e.type;
	return t === "number" || t === "range";
}
function Ki(e) {
	return e === "" ? null : +e;
}
var qi = /* @__PURE__ */ new class e {
	#e = /* @__PURE__ */ new WeakMap();
	#t;
	#n;
	static entries = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		this.#n = e;
	}
	observe(e, t) {
		var n = this.#e.get(e) || /* @__PURE__ */ new Set();
		return n.add(t), this.#e.set(e, n), this.#r().observe(e, this.#n), () => {
			var n = this.#e.get(e);
			n.delete(t), n.size === 0 && (this.#e.delete(e), this.#t.unobserve(e));
		};
	}
	#r() {
		return this.#t ??= new ResizeObserver((t) => {
			for (var n of t) {
				e.entries.set(n.target, n);
				for (var r of this.#e.get(n.target) || []) r(n);
			}
		});
	}
}({ box: "border-box" });
function Ji(e, t, n) {
	var r = qi.observe(e, () => n(e[t]));
	Tn(() => (fr(() => n(e[t])), r));
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/props.js
var Yi = {
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
function Xi(e, t, n) {
	return new Proxy({
		props: e,
		exclude: t
	}, Yi);
}
function Zi(e, t, n, r) {
	var i = !0, o = !!(n & 8), s = !!(n & 16), c = r, l = !0, u = void 0, d = () => s && i ? (u ??= /* @__PURE__ */ bt(r), q(u)) : (l && (l = !1, c = s ? fr(r) : r), c);
	let f;
	if (o) {
		var p = ce in e || le in e;
		f = a(e, t)?.set ?? (p && t in e ? (n) => e[t] = n : void 0);
	}
	var m, h = !1;
	o ? [m, h] = ot(() => e[t]) : m = e[t], m === void 0 && r !== void 0 && (m = d(), f && (i && Te(t), f(m)));
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
	var v = !1, y = (n & 1 ? bt : Ct)(() => (v = !1, g()));
	o && q(y);
	var b = W;
	return (function(e, t) {
		if (arguments.length > 0) {
			let n = t ? q(y) : i && o ? nn(e) : e;
			return I(y, n), v = !0, c !== void 0 && (c = n), e;
		}
		return Un && v || b.f & 16384 ? y.v : q(y);
	});
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/context.js
var Qi = Symbol("phosphor-svelte");
function $i() {
	return Ge(Qi) ? We(Qi) : {};
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/ArrowUpIcon.svelte
var ea = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), ta = /* @__PURE__ */ Y("<path d=\"M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z\"></path>"), na = /* @__PURE__ */ Y("<path d=\"M200,112H56l72-72Z\" opacity=\"0.2\"></path><path d=\"M205.66,106.34l-72-72a8,8,0,0,0-11.32,0l-72,72A8,8,0,0,0,56,120h64v96a8,8,0,0,0,16,0V120h64a8,8,0,0,0,5.66-13.66ZM75.31,104,128,51.31,180.69,104Z\"></path>", 1), ra = /* @__PURE__ */ Y("<path d=\"M207.39,115.06A8,8,0,0,1,200,120H136v96a8,8,0,0,1-16,0V120H56a8,8,0,0,1-5.66-13.66l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,207.39,115.06Z\"></path>"), ia = /* @__PURE__ */ Y("<path d=\"M204.24,116.24a6,6,0,0,1-8.48,0L134,54.49V216a6,6,0,0,1-12,0V54.49L60.24,116.24a6,6,0,0,1-8.48-8.48l72-72a6,6,0,0,1,8.48,0l72,72A6,6,0,0,1,204.24,116.24Z\"></path>"), aa = /* @__PURE__ */ Y("<path d=\"M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z\"></path>"), oa = /* @__PURE__ */ Y("<path d=\"M202.83,114.83a4,4,0,0,1-5.66,0L132,49.66V216a4,4,0,0,1-8,0V49.66L58.83,114.83a4,4,0,0,1-5.66-5.66l72-72a4,4,0,0,1,5.66,0l72,72A4,4,0,0,1,202.83,114.83Z\"></path>"), sa = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function ca(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, ea), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = sa();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, ta());
	}, m = (e) => {
		var t = na();
		O(), X(e, t);
	}, h = (e) => {
		X(e, ra());
	}, g = (e) => {
		X(e, ia());
	}, _ = (e) => {
		X(e, aa());
	}, v = (e) => {
		X(e, oa());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/DotsSixIcon.svelte
var la = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), ua = /* @__PURE__ */ Y("<path d=\"M76,92A16,16,0,1,1,60,76,16,16,0,0,1,76,92Zm52-16a16,16,0,1,0,16,16A16,16,0,0,0,128,76Zm68,32a16,16,0,1,0-16-16A16,16,0,0,0,196,108ZM60,148a16,16,0,1,0,16,16A16,16,0,0,0,60,148Zm68,0a16,16,0,1,0,16,16A16,16,0,0,0,128,148Zm68,0a16,16,0,1,0,16,16A16,16,0,0,0,196,148Z\"></path>"), da = /* @__PURE__ */ Y("<path d=\"M240,64V192a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V64A16,16,0,0,1,32,48H224A16,16,0,0,1,240,64Z\" opacity=\"0.2\"></path><path d=\"M72,92A12,12,0,1,1,60,80,12,12,0,0,1,72,92Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,128,80Zm68,24a12,12,0,1,0-12-12A12,12,0,0,0,196,104ZM60,152a12,12,0,1,0,12,12A12,12,0,0,0,60,152Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,128,152Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,196,152Z\"></path>", 1), fa = /* @__PURE__ */ Y("<path d=\"M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48ZM68,168a12,12,0,1,1,12-12A12,12,0,0,1,68,168Zm0-56a12,12,0,1,1,12-12A12,12,0,0,1,68,112Zm60,56a12,12,0,1,1,12-12A12,12,0,0,1,128,168Zm0-56a12,12,0,1,1,12-12A12,12,0,0,1,128,112Zm60,56a12,12,0,1,1,12-12A12,12,0,0,1,188,168Zm0-56a12,12,0,1,1,12-12A12,12,0,0,1,188,112Z\"></path>"), pa = /* @__PURE__ */ Y("<path d=\"M70,92A10,10,0,1,1,60,82,10,10,0,0,1,70,92Zm58-10a10,10,0,1,0,10,10A10,10,0,0,0,128,82Zm68,20a10,10,0,1,0-10-10A10,10,0,0,0,196,102ZM60,154a10,10,0,1,0,10,10A10,10,0,0,0,60,154Zm68,0a10,10,0,1,0,10,10A10,10,0,0,0,128,154Zm68,0a10,10,0,1,0,10,10A10,10,0,0,0,196,154Z\"></path>"), ma = /* @__PURE__ */ Y("<path d=\"M72,92A12,12,0,1,1,60,80,12,12,0,0,1,72,92Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,128,80Zm68,24a12,12,0,1,0-12-12A12,12,0,0,0,196,104ZM60,152a12,12,0,1,0,12,12A12,12,0,0,0,60,152Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,128,152Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,196,152Z\"></path>"), ha = /* @__PURE__ */ Y("<path d=\"M68,92a8,8,0,1,1-8-8A8,8,0,0,1,68,92Zm60-8a8,8,0,1,0,8,8A8,8,0,0,0,128,84Zm68,16a8,8,0,1,0-8-8A8,8,0,0,0,196,100ZM60,156a8,8,0,1,0,8,8A8,8,0,0,0,60,156Zm68,0a8,8,0,1,0,8,8A8,8,0,0,0,128,156Zm68,0a8,8,0,1,0,8,8A8,8,0,0,0,196,156Z\"></path>"), ga = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function _a(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, la), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = ga();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, ua());
	}, m = (e) => {
		var t = da();
		O(), X(e, t);
	}, h = (e) => {
		X(e, fa());
	}, g = (e) => {
		X(e, pa());
	}, _ = (e) => {
		X(e, ma());
	}, v = (e) => {
		X(e, ha());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/DotsSixVerticalIcon.svelte
var va = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), ya = /* @__PURE__ */ Y("<path d=\"M108,60A16,16,0,1,1,92,44,16,16,0,0,1,108,60Zm56,16a16,16,0,1,0-16-16A16,16,0,0,0,164,76ZM92,112a16,16,0,1,0,16,16A16,16,0,0,0,92,112Zm72,0a16,16,0,1,0,16,16A16,16,0,0,0,164,112ZM92,180a16,16,0,1,0,16,16A16,16,0,0,0,92,180Zm72,0a16,16,0,1,0,16,16A16,16,0,0,0,164,180Z\"></path>"), ba = /* @__PURE__ */ Y("<path d=\"M208,32V224a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V32A16,16,0,0,1,64,16H192A16,16,0,0,1,208,32Z\" opacity=\"0.2\"></path><path d=\"M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z\"></path>", 1), xa = /* @__PURE__ */ Y("<path d=\"M192,16H64A16,16,0,0,0,48,32V224a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V32A16,16,0,0,0,192,16ZM100,200a12,12,0,1,1,12-12A12,12,0,0,1,100,200Zm0-60a12,12,0,1,1,12-12A12,12,0,0,1,100,140Zm0-60a12,12,0,1,1,12-12A12,12,0,0,1,100,80Zm56,120a12,12,0,1,1,12-12A12,12,0,0,1,156,200Zm0-60a12,12,0,1,1,12-12A12,12,0,0,1,156,140Zm0-60a12,12,0,1,1,12-12A12,12,0,0,1,156,80Z\"></path>"), Sa = /* @__PURE__ */ Y("<path d=\"M102,60A10,10,0,1,1,92,50,10,10,0,0,1,102,60Zm62,10a10,10,0,1,0-10-10A10,10,0,0,0,164,70ZM92,118a10,10,0,1,0,10,10A10,10,0,0,0,92,118Zm72,0a10,10,0,1,0,10,10A10,10,0,0,0,164,118ZM92,186a10,10,0,1,0,10,10A10,10,0,0,0,92,186Zm72,0a10,10,0,1,0,10,10A10,10,0,0,0,164,186Z\"></path>"), Ca = /* @__PURE__ */ Y("<path d=\"M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z\"></path>"), wa = /* @__PURE__ */ Y("<path d=\"M100,60a8,8,0,1,1-8-8A8,8,0,0,1,100,60Zm64,8a8,8,0,1,0-8-8A8,8,0,0,0,164,68ZM92,120a8,8,0,1,0,8,8A8,8,0,0,0,92,120Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,164,120ZM92,188a8,8,0,1,0,8,8A8,8,0,0,0,92,188Zm72,0a8,8,0,1,0,8,8A8,8,0,0,0,164,188Z\"></path>"), Ta = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function Ea(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, va), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Ta();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, ya());
	}, m = (e) => {
		var t = ba();
		O(), X(e, t);
	}, h = (e) => {
		X(e, xa());
	}, g = (e) => {
		X(e, Sa());
	}, _ = (e) => {
		X(e, Ca());
	}, v = (e) => {
		X(e, wa());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/PlusIcon.svelte
var Da = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), Oa = /* @__PURE__ */ Y("<path d=\"M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z\"></path>"), ka = /* @__PURE__ */ Y("<path d=\"M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z\" opacity=\"0.2\"></path><path d=\"M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z\"></path>", 1), Aa = /* @__PURE__ */ Y("<path d=\"M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM184,136H136v48a8,8,0,0,1-16,0V136H72a8,8,0,0,1,0-16h48V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z\"></path>"), ja = /* @__PURE__ */ Y("<path d=\"M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z\"></path>"), Ma = /* @__PURE__ */ Y("<path d=\"M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z\"></path>"), Na = /* @__PURE__ */ Y("<path d=\"M220,128a4,4,0,0,1-4,4H132v84a4,4,0,0,1-8,0V132H40a4,4,0,0,1,0-8h84V40a4,4,0,0,1,8,0v84h84A4,4,0,0,1,220,128Z\"></path>"), Pa = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function Fa(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, Da), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Pa();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, Oa());
	}, m = (e) => {
		var t = ka();
		O(), X(e, t);
	}, h = (e) => {
		X(e, Aa());
	}, g = (e) => {
		X(e, ja());
	}, _ = (e) => {
		X(e, Ma());
	}, v = (e) => {
		X(e, Na());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/XIcon.svelte
var Ia = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), La = /* @__PURE__ */ Y("<path d=\"M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z\"></path>"), Ra = /* @__PURE__ */ Y("<path d=\"M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z\" opacity=\"0.2\"></path><path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"></path>", 1), za = /* @__PURE__ */ Y("<path d=\"M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM181.66,170.34a8,8,0,0,1-11.32,11.32L128,139.31,85.66,181.66a8,8,0,0,1-11.32-11.32L116.69,128,74.34,85.66A8,8,0,0,1,85.66,74.34L128,116.69l42.34-42.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"></path>"), Ba = /* @__PURE__ */ Y("<path d=\"M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z\"></path>"), Va = /* @__PURE__ */ Y("<path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"></path>"), Ha = /* @__PURE__ */ Y("<path d=\"M202.83,197.17a4,4,0,0,1-5.66,5.66L128,133.66,58.83,202.83a4,4,0,0,1-5.66-5.66L122.34,128,53.17,58.83a4,4,0,0,1,5.66-5.66L128,122.34l69.17-69.17a4,4,0,1,1,5.66,5.66L133.66,128Z\"></path>"), Ua = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function Wa(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, Ia), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Ua();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, La());
	}, m = (e) => {
		var t = Ra();
		O(), X(e, t);
	}, h = (e) => {
		X(e, za());
	}, g = (e) => {
		X(e, Ba());
	}, _ = (e) => {
		X(e, Va());
	}, v = (e) => {
		X(e, Ha());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/ClockIcon.svelte
var Ga = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), Ka = /* @__PURE__ */ Y("<path d=\"M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm68-84a12,12,0,0,1-12,12H128a12,12,0,0,1-12-12V72a12,12,0,0,1,24,0v44h44A12,12,0,0,1,196,128Z\"></path>"), qa = /* @__PURE__ */ Y("<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"></path><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z\"></path>", 1), Ja = /* @__PURE__ */ Y("<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm56,112H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z\"></path>"), Ya = /* @__PURE__ */ Y("<path d=\"M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm0,192a90,90,0,1,1,90-90A90.1,90.1,0,0,1,128,218Zm62-90a6,6,0,0,1-6,6H128a6,6,0,0,1-6-6V72a6,6,0,0,1,12,0v50h50A6,6,0,0,1,190,128Z\"></path>"), Xa = /* @__PURE__ */ Y("<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z\"></path>"), Za = /* @__PURE__ */ Y("<path d=\"M128,28A100,100,0,1,0,228,128,100.11,100.11,0,0,0,128,28Zm0,192a92,92,0,1,1,92-92A92.1,92.1,0,0,1,128,220Zm60-92a4,4,0,0,1-4,4H128a4,4,0,0,1-4-4V72a4,4,0,0,1,8,0v52h52A4,4,0,0,1,188,128Z\"></path>"), Qa = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function $a(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, Ga), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Qa();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, Ka());
	}, m = (e) => {
		var t = qa();
		O(), X(e, t);
	}, h = (e) => {
		X(e, Ja());
	}, g = (e) => {
		X(e, Ya());
	}, _ = (e) => {
		X(e, Xa());
	}, v = (e) => {
		X(e, Za());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
var eo = 6e4, to = /^(\d{1,2}):([0-5]\d)$/;
function no(e) {
	return Math.round(e / 500 * 100);
}
function ro(e) {
	return Math.min(100, Math.max(0, e));
}
function io(e, t) {
	return e.kind === "clock" ? e.dueAt : t + e.minutes * eo;
}
function ao(e, t) {
	return e.kind === "minutes" ? e.minutes : oo(e.dueAt, t);
}
function oo(e, t) {
	return Math.max(0, Math.ceil((e - t) / eo));
}
function so(e) {
	if (e < 60) return `${e} min`;
	let t = Math.floor(e / 60), n = e % 60;
	return n === 0 ? `${t} h` : `${t} h ${n} min`;
}
function co(e, t, n) {
	let r = t - e;
	return e <= 0 || r <= 0 ? 1 : Math.min(1, Math.max(0, (t - n) / r));
}
function lo(e, t) {
	let n = oo(e, t);
	return n < 60 ? `${n}` : `${Math.round(n / 60)}h`;
}
function uo(e) {
	let t = new Date(e);
	return `${mo(t.getHours())}:${mo(t.getMinutes())}`;
}
function fo(e) {
	let t = to.exec(e.trim());
	if (t === null) return null;
	let n = Number(t[1]);
	return n > 23 ? null : {
		hours: n,
		minutes: Number(t[2])
	};
}
function po(e, t) {
	let n = new Date(t);
	return n.setHours(e.hours, e.minutes, 0, 0), n.getTime() <= t && n.setDate(n.getDate() + 1), n.getTime();
}
function mo(e) {
	return e.toString().padStart(2, "0");
}
//#endregion
//#region deskminder/src/lib.ts
function ho(e) {
	return typeof e != "object" || !e ? {} : e;
}
function go(e) {
	let t = ho(e).reminders;
	return Array.isArray(t) ? t.flatMap(_o) : [];
}
function _o(e) {
	let t = ho(e);
	return typeof t.id != "string" || typeof t.dueAt != "number" ? [] : [{
		id: t.id,
		text: yo(t.text),
		armedAt: bo(t.armedAt),
		dueAt: t.dueAt,
		firedAt: bo(t.firedAt)
	}];
}
function vo(e) {
	e.focus(), e.select();
}
function yo(e) {
	return typeof e == "string" ? e : "";
}
function bo(e) {
	return typeof e == "number" ? e : 0;
}
function xo(e, t) {
	let n = e.get(t);
	if (n === void 0) throw Error(`views: service "${t}" is not available`);
	return n;
}
//#endregion
//#region deskminder/src/DurationChip.svelte
var So = /* @__PURE__ */ Fr("<input type=\"text\" placeholder=\"HH:mm\"/>"), Co = /* @__PURE__ */ Fr("<button class=\"flex cursor-text items-center gap-2 font-medium whitespace-nowrap tabular-nums\" type=\"button\"><span> </span> <span class=\"opacity-40\">·</span> <span class=\"opacity-60\"> </span></button>"), wo = /* @__PURE__ */ Fr("<div class=\"flex shrink-0 items-center gap-2 pl-1 text-sm\"><!> <!></div>");
function To(e, t) {
	A(t, !0);
	let n = Zi(t, "editing", 3, !1), r = /* @__PURE__ */ F(""), i = /* @__PURE__ */ F(!1), a = /* @__PURE__ */ N(() => ao(t.duration, t.now)), o = /* @__PURE__ */ N(() => uo(io(t.duration, t.now)));
	function s() {
		I(r, q(o), !0), I(i, !1), t.onedit(!0);
	}
	function c() {
		let e = fo(q(r));
		if (e === null) {
			I(i, !0);
			return;
		}
		t.onduration({
			kind: "clock",
			dueAt: po(e, Date.now())
		}), t.onedit(!1);
	}
	function l(e) {
		e.key === "Enter" && (e.preventDefault(), e.stopPropagation(), c()), e.key === "Escape" && (e.stopPropagation(), t.onedit(!1));
	}
	var u = wo(), d = R(u);
	$a(d, { class: "size-4 opacity-60" });
	var f = B(d, 2), p = (e) => {
		var t = So();
		Li(t);
		let n;
		Tn(() => Wi(t, () => q(r), (e) => I(r, e))), pi(t, (e) => vo?.(e)), On(() => n = Ci(t, 1, "w-16 bg-transparent text-center font-medium tabular-nums outline-none", null, n, { "text-error": q(i) })), J("keydown", t, l), Dr("blur", t, c), X(e, t);
	}, m = (e) => {
		var t = Co(), n = R(t), r = R(n, !0);
		D(n);
		var i = B(n, 4), c = R(i, !0);
		D(i), D(t), On((e) => {
			Br(r, e), Br(c, q(o));
		}, [() => so(q(a))]), J("click", t, s), X(e, t);
	};
	Z(f, (e) => {
		n() ? e(p) : e(m, -1);
	}), D(u), X(e, u), j();
}
Or(["keydown", "click"]);
//#endregion
//#region deskminder/src/PendingList.svelte
var Eo = /* @__PURE__ */ Fr("<button class=\"group/tile relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-base-300/90 shadow-lg ring-1 ring-white/10 hover:bg-base-300\" type=\"button\"><svg class=\"absolute inset-0 size-full -rotate-90\" aria-hidden=\"true\"><circle class=\"stroke-white/10\" fill=\"none\" stroke-width=\"2.5\"></circle><circle class=\"stroke-primary\" fill=\"none\" stroke-width=\"2.5\" stroke-linecap=\"round\"></circle></svg> <span class=\"text-sm font-medium tabular-nums group-hover/tile:opacity-0\"> </span> <!></button>");
function Do(e, t) {
	A(t, !0);
	let n = 2 * Math.PI * 20, r = /* @__PURE__ */ N(() => [...t.reminders].sort((e, t) => e.dueAt - t.dueAt));
	function i(e) {
		return n * (1 - co(e.armedAt, e.dueAt, t.now));
	}
	function a(e) {
		return e.text === "" ? uo(e.dueAt) : `${e.text} — ${uo(e.dueAt)}`;
	}
	var o = Rr();
	Xr(z(o), 17, () => q(r), (e) => e.id, (e, r) => {
		var o = Eo(), s = R(o);
		Q(s, "viewBox", "0 0 44 44");
		var c = R(s);
		Q(c, "cx", 22), Q(c, "cy", 22), Q(c, "r", 20);
		var l = B(c);
		Q(l, "cx", 22), Q(l, "cy", 22), Q(l, "r", 20), Q(l, "stroke-dasharray", n), D(s);
		var u = B(s, 2), d = R(u, !0);
		D(u), Wa(B(u, 2), { class: "absolute size-4 opacity-0 transition-opacity group-hover/tile:opacity-100" }), D(o), On((e, t, n) => {
			Q(o, "title", e), Q(l, "stroke-dashoffset", t), Br(d, n);
		}, [
			() => a(q(r)),
			() => i(q(r)),
			() => lo(q(r).dueAt, t.now)
		]), J("click", o, () => t.oncancel(q(r).id)), X(e, o);
	}), X(e, o), j();
}
Or(["click"]);
//#endregion
//#region deskminder/src/barShape.ts
function Oo(e, t, n) {
	let r = t / 2, i = r, a = Math.max(r, e - r), o = e / 2, s = `A ${$(r)} ${$(r)} 0 0 1`;
	return [
		`path("M ${$(i)} 0`,
		`Q ${$(o)} ${$(ko(n))} ${$(a)} 0`,
		`${s} ${$(a)} ${$(t)}`,
		`Q ${$(o)} ${$(t - ko(n))} ${$(i)} ${$(t)}`,
		`${s} ${$(i)} 0 Z")`
	].join(" ");
}
function ko(e) {
	return 2 * e;
}
function $(e) {
	return `${Math.round(e * 100) / 100}`;
}
//#endregion
//#region deskminder/src/placement.ts
var Ao = 8, jo = 40, Mo = 88, No = {
	x: 32,
	y: 96
};
function Po(e, t, n) {
	let r = Math.max(Ao, n.width - Ao - t.width), i = Math.max(jo, n.height - Mo - t.height);
	return {
		x: Math.min(Math.max(Ao, e.x), r),
		y: Math.min(Math.max(jo, e.y), i)
	};
}
function Fo(e) {
	if (typeof e != "object" || !e) return No;
	let { x: t, y: n } = e;
	return typeof t != "number" || typeof n != "number" ? No : {
		x: t,
		y: n
	};
}
//#endregion
//#region deskminder/src/Pill.svelte
var Io = /* @__PURE__ */ Fr("<button class=\"flex size-9 cursor-grab items-center justify-center rounded-2xl bg-base-300/60 opacity-0 shadow-lg ring-1 ring-white/10 backdrop-blur-xl transition-opacity group-hover:opacity-100\" type=\"button\" title=\"Drag to move\"><!></button> <button class=\"flex size-11 shrink-0 items-center justify-center rounded-2xl bg-base-300/70 shadow-lg ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-base-300/90 active:scale-95\" type=\"button\" title=\"New reminder\"><!></button>", 1), Lo = /* @__PURE__ */ Fr("<input class=\"min-w-0 grow bg-transparent text-sm outline-none placeholder:opacity-40\" type=\"text\" placeholder=\"Reminder\"/> <button class=\"flex size-7 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10\" type=\"button\" title=\"Set reminder\"><!></button>", 1), Ro = /* @__PURE__ */ Fr("<button class=\"ml-auto flex h-full w-6 shrink-0 cursor-ew-resize items-center justify-center opacity-50 transition-opacity hover:opacity-100\" type=\"button\" title=\"Drag to set the duration\"><!></button>"), zo = /* @__PURE__ */ Fr("<button class=\"flex size-11 shrink-0 items-center justify-center rounded-2xl bg-base-300/70 shadow-lg ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-base-300/90\" type=\"button\" title=\"Discard\"><!></button> <div><!> <!></div>", 1), Bo = /* @__PURE__ */ Fr("<div class=\"group fixed z-10 flex w-max items-center gap-2 text-base-content select-none\" data-input-region=\"\"><!> <!></div>");
function Vo(e, t) {
	A(t, !0);
	let n = 1e4, r = /* @__PURE__ */ F("idle"), i = /* @__PURE__ */ F(nn({
		kind: "minutes",
		minutes: 15
	})), a = /* @__PURE__ */ F(""), o = /* @__PURE__ */ F(!1), s = /* @__PURE__ */ F(nn([])), c = /* @__PURE__ */ F(nn(Date.now())), l = /* @__PURE__ */ F(nn(No)), u = /* @__PURE__ */ F(null), d = /* @__PURE__ */ F(null), f = /* @__PURE__ */ F(null), p = /* @__PURE__ */ F(0), m = /* @__PURE__ */ F(0), h = /* @__PURE__ */ F(1920), g = /* @__PURE__ */ F(1080), _ = !1, v = /* @__PURE__ */ N(() => q(s).filter((e) => e.firedAt === 0)), y = /* @__PURE__ */ N(() => Po(re(), {
		width: q(p),
		height: q(m)
	}, {
		width: q(h),
		height: q(g)
	})), b = /* @__PURE__ */ N(() => ao(q(i), q(c)) / 100), x = /* @__PURE__ */ N(() => q(d) !== null), S = /* @__PURE__ */ N(() => 200 + q(b) * 260), ee = /* @__PURE__ */ N(() => ie(q(r), q(S))), te = /* @__PURE__ */ N(() => ae(q(x), q(S), q(b)));
	Sn(() => {
		let e = t.bus.subscribe("reminders", (e) => {
			I(s, go(e.data), !0);
		}), n = t.bus.subscribe("config", (e) => {
			se(e.data);
		});
		return () => {
			e(), n();
		};
	}), Sn(() => {
		let e = setInterval(() => {
			I(c, Date.now(), !0);
		}, 1e3);
		return () => clearInterval(e);
	}), Sn(() => {
		let e = () => {
			I(h, window.innerWidth, !0), I(g, window.innerHeight, !0);
		};
		return e(), window.addEventListener("resize", e), () => window.removeEventListener("resize", e);
	}), Sn(() => {
		if (q(d) !== null) return ne(le, ue);
	}), Sn(() => {
		if (q(f) !== null) return ne(pe, me);
	});
	function ne(e, t) {
		return window.addEventListener("pointermove", e), window.addEventListener("pointerup", t), window.addEventListener("pointercancel", t), () => {
			window.removeEventListener("pointermove", e), window.removeEventListener("pointerup", t), window.removeEventListener("pointercancel", t);
		};
	}
	function re() {
		return q(u) === null ? q(l) : q(u);
	}
	function ie(e, t) {
		return e === "setting" ? `${t}px` : "";
	}
	function ae(e, t, n) {
		return e ? Oo(t, 44, n * 5) : "";
	}
	function oe(e) {
		I(i, e, !0), I(r, "composing");
	}
	function se(e) {
		q(f) === null && I(l, Fo(ho(ho(e).deskminder).pill), !0);
	}
	function ce(e, t, n) {
		e.button === 0 && (e.preventDefault(), _ = !1, I(d, {
			pointerId: e.pointerId,
			startX: e.clientX,
			baseMinutes: t,
			fromIdle: n
		}, !0), I(r, "setting"), I(o, !1));
	}
	function le(e) {
		if (q(d) === null || q(d).pointerId !== e.pointerId) return;
		let t = e.clientX - q(d).startX;
		Math.abs(t) > 4 && (_ = !0);
		let n = ro(q(d).baseMinutes + no(t));
		I(i, {
			kind: "minutes",
			minutes: n
		}, !0);
	}
	function ue(e) {
		if (q(d) === null || q(d).pointerId !== e.pointerId) return;
		let t = q(d);
		I(d, null), de(t);
	}
	function de(e) {
		if (e.fromIdle && !_) {
			I(i, {
				kind: "minutes",
				minutes: 15
			}, !0);
			return;
		}
		if (ao(q(i), Date.now()) === 0) {
			ge();
			return;
		}
		I(r, "composing");
	}
	function fe(e) {
		e.button === 0 && (e.preventDefault(), I(f, {
			pointerId: e.pointerId,
			offsetX: e.clientX - q(y).x,
			offsetY: e.clientY - q(y).y
		}, !0), I(u, q(y), !0));
	}
	function pe(e) {
		q(f) !== null && q(f).pointerId === e.pointerId && I(u, {
			x: e.clientX - q(f).offsetX,
			y: e.clientY - q(f).offsetY
		}, !0);
	}
	function me(e) {
		if (q(f) === null || q(f).pointerId !== e.pointerId) return;
		I(f, null);
		let r = {
			x: Math.round(q(y).x),
			y: Math.round(q(y).y)
		};
		I(l, r, !0), I(u, null), t.bus.call("config:set", {
			key: "deskminder.pill",
			value: r
		}, n);
	}
	async function he() {
		let e = io(q(i), Date.now());
		e <= Date.now() || (ge(), await t.bus.call("reminder:create", {
			dueAt: e,
			text: q(a).trim()
		}, n));
	}
	function ge() {
		I(r, "idle"), I(i, {
			kind: "minutes",
			minutes: 15
		}, !0), I(a, ""), I(o, !1);
	}
	function _e(e) {
		e.key === "Enter" && (e.preventDefault(), he()), e.key === "Escape" && ge();
	}
	function ve(e) {
		t.bus.call("reminder:cancel", { id: e }, n);
	}
	var ye = Bo();
	let be;
	var xe = R(ye), Se = (e) => {
		var t = Io(), n = z(t);
		_a(R(n), { class: "size-4" }), D(n);
		var r = B(n, 2);
		Fa(R(r), { class: "size-5" }), D(r), J("pointerdown", n, fe), J("pointerdown", r, (e) => ce(e, 0, !0)), X(e, t);
	}, Ce = (e) => {
		var t = zo(), n = z(t);
		Wa(R(n), { class: "size-5" }), D(n);
		var s = B(n, 2);
		let l, u;
		var d = R(s);
		To(d, {
			get duration() {
				return q(i);
			},
			get now() {
				return q(c);
			},
			get editing() {
				return q(o);
			},
			onduration: oe,
			onedit: (e) => I(o, e, !0)
		});
		var f = B(d, 2), p = (e) => {
			var t = Lo(), n = z(t);
			Li(n), Tn(() => Wi(n, () => q(a), (e) => I(a, e))), pi(n, (e) => vo?.(e));
			var r = B(n, 2);
			ca(R(r), { class: "size-4" }), D(r), J("keydown", n, _e), J("click", r, () => void he()), X(e, t);
		}, m = (e) => {
			var t = Ro();
			Ea(R(t), { class: "size-4" }), D(t), J("pointerdown", t, (e) => ce(e, ao(q(i), Date.now()), !1)), X(e, t);
		};
		Z(f, (e) => {
			q(r) === "composing" ? e(p) : e(m, -1);
		}), D(s), On(() => {
			l = Ci(s, 1, "flex h-11 items-center gap-2 rounded-full bg-base-300/70 px-3 ring-white/10 backdrop-blur-xl", null, l, {
				"shadow-lg": !q(x),
				"ring-1": !q(x),
				"drop-shadow-lg": q(x),
				"min-w-72": q(r) === "composing"
			}), u = Ti(s, "", u, {
				width: q(ee),
				"clip-path": q(te)
			});
		}), J("click", n, ge), X(e, t);
	};
	Z(xe, (e) => {
		q(r) === "idle" ? e(Se) : e(Ce, -1);
	}), Do(B(xe, 2), {
		get reminders() {
			return q(v);
		},
		get now() {
			return q(c);
		},
		oncancel: ve
	}), D(ye), On(() => be = Ti(ye, "", be, {
		left: `${q(y).x}px`,
		top: `${q(y).y}px`
	})), Ji(ye, "clientWidth", (e) => I(p, e)), Ji(ye, "clientHeight", (e) => I(m, e)), X(e, ye), j();
}
Or([
	"pointerdown",
	"click",
	"keydown"
]);
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/transition/index.js
var Ho = (e) => e;
function Uo(e) {
	let t = e - 1;
	return t * t * t + 1;
}
function Wo(e) {
	let t = typeof e == "string" && e.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
	return t ? [parseFloat(t[1]), t[2] || "px"] : [e, "px"];
}
function Go(e, { delay: t = 0, duration: n = 400, easing: r = Ho } = {}) {
	let i = +getComputedStyle(e).opacity;
	return {
		delay: t,
		duration: n,
		easing: r,
		css: (e) => `opacity: ${e * i}`
	};
}
function Ko(e, { delay: t = 0, duration: n = 400, easing: r = Uo, x: i = 0, y: a = 0, opacity: o = 0 } = {}) {
	let s = getComputedStyle(e), c = +s.opacity, l = s.transform === "none" ? "" : s.transform, u = c * (1 - o), [d, f] = Wo(i), [p, m] = Wo(a);
	return {
		delay: t,
		duration: n,
		easing: r,
		css: (e, t) => `
			transform: ${l} translate(${(1 - e) * d}${f}, ${(1 - e) * p}${m});
			opacity: ${c - u * t}`
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/easing/index.js
function qo(e) {
	let t = e - 1;
	return t * t * t + 1;
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/ClockCountdownIcon.svelte
var Jo = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), Yo = /* @__PURE__ */ Y("<path d=\"M236,137A108.13,108.13,0,1,1,119,20,12,12,0,0,1,121,44,84.12,84.12,0,1,0,212,135,12,12,0,1,1,236,137ZM116,76v52a12,12,0,0,0,12,12h52a12,12,0,0,0,0-24H140V76a12,12,0,0,0-24,0Zm92,20a16,16,0,1,0-16-16A16,16,0,0,0,208,96ZM176,64a16,16,0,1,0-16-16A16,16,0,0,0,176,64Z\"></path>"), Xo = /* @__PURE__ */ Y("<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"></path><path d=\"M232,136.66A104.12,104.12,0,1,1,119.34,24,8,8,0,0,1,120.66,40,88.12,88.12,0,1,0,216,135.34,8,8,0,0,1,232,136.66ZM120,72v56a8,8,0,0,0,8,8h56a8,8,0,0,0,0-16H136V72a8,8,0,0,0-16,0Zm40-24a12,12,0,1,0-12-12A12,12,0,0,0,160,48Zm36,24a12,12,0,1,0-12-12A12,12,0,0,0,196,72Zm24,36a12,12,0,1,0-12-12A12,12,0,0,0,220,108Z\"></path>", 1), Zo = /* @__PURE__ */ Y("<path d=\"M208,96a12,12,0,1,1,12,12A12,12,0,0,1,208,96ZM196,72a12,12,0,1,0-12-12A12,12,0,0,0,196,72Zm28.66,56a8,8,0,0,0-8.63,7.31A88.12,88.12,0,1,1,120.66,40,8,8,0,0,0,119.34,24,104.12,104.12,0,1,0,232,136.66,8,8,0,0,0,224.66,128ZM128,56a72,72,0,1,1-72,72A72.08,72.08,0,0,1,128,56Zm-8,72a8,8,0,0,0,8,8h48a8,8,0,0,0,0-16H136V80a8,8,0,0,0-16,0Zm40-80a12,12,0,1,0-12-12A12,12,0,0,0,160,48Z\"></path>"), Qo = /* @__PURE__ */ Y("<path d=\"M230,136.49A102.12,102.12,0,1,1,119.51,26a6,6,0,0,1,1,12A90.13,90.13,0,1,0,218,135.51a6,6,0,1,1,12,1ZM122,72v56a6,6,0,0,0,6,6h56a6,6,0,0,0,0-12H134V72a6,6,0,0,0-12,0Zm38-26a10,10,0,1,0-10-10A10,10,0,0,0,160,46Zm36,24a10,10,0,1,0-10-10A10,10,0,0,0,196,70Zm24,36a10,10,0,1,0-10-10A10,10,0,0,0,220,106Z\"></path>"), $o = /* @__PURE__ */ Y("<path d=\"M232,136.66A104.12,104.12,0,1,1,119.34,24,8,8,0,0,1,120.66,40,88.12,88.12,0,1,0,216,135.34,8,8,0,0,1,232,136.66ZM120,72v56a8,8,0,0,0,8,8h56a8,8,0,0,0,0-16H136V72a8,8,0,0,0-16,0Zm40-24a12,12,0,1,0-12-12A12,12,0,0,0,160,48Zm36,24a12,12,0,1,0-12-12A12,12,0,0,0,196,72Zm24,36a12,12,0,1,0-12-12A12,12,0,0,0,220,108Z\"></path>"), es = /* @__PURE__ */ Y("<path d=\"M228,136.33A100.13,100.13,0,1,1,119.67,28a4,4,0,1,1,.66,8A92.13,92.13,0,1,0,220,135.67a4,4,0,1,1,8,.66ZM128,132h56a4,4,0,0,0,0-8H132V72a4,4,0,0,0-8,0v56A4,4,0,0,0,128,132Zm32-88a8,8,0,1,0-8-8A8,8,0,0,0,160,44Zm36,24a8,8,0,1,0-8-8A8,8,0,0,0,196,68Zm24,36a8,8,0,1,0-8-8A8,8,0,0,0,220,104Z\"></path>"), ts = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function ns(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, Jo), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = ts();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, Yo());
	}, m = (e) => {
		var t = Xo();
		O(), X(e, t);
	}, h = (e) => {
		X(e, Zo());
	}, g = (e) => {
		X(e, Qo());
	}, _ = (e) => {
		X(e, $o());
	}, v = (e) => {
		X(e, es());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/CircleIcon.svelte
var rs = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), is = /* @__PURE__ */ Y("<path d=\"M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Z\"></path>"), as = /* @__PURE__ */ Y("<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"></path><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z\"></path>", 1), os = /* @__PURE__ */ Y("<path d=\"M232,128A104,104,0,1,1,128,24,104.13,104.13,0,0,1,232,128Z\"></path>"), ss = /* @__PURE__ */ Y("<path d=\"M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm0,192a90,90,0,1,1,90-90A90.1,90.1,0,0,1,128,218Z\"></path>"), cs = /* @__PURE__ */ Y("<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z\"></path>"), ls = /* @__PURE__ */ Y("<path d=\"M128,28A100,100,0,1,0,228,128,100.11,100.11,0,0,0,128,28Zm0,192a92,92,0,1,1,92-92A92.1,92.1,0,0,1,128,220Z\"></path>"), us = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function ds(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, rs), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = us();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, is());
	}, m = (e) => {
		var t = as();
		O(), X(e, t);
	}, h = (e) => {
		X(e, os());
	}, g = (e) => {
		X(e, ss());
	}, _ = (e) => {
		X(e, cs());
	}, v = (e) => {
		X(e, ls());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/RepeatIcon.svelte
var fs = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), ps = /* @__PURE__ */ Y("<path d=\"M20,128A76.08,76.08,0,0,1,96,52h99l-3.52-3.51a12,12,0,1,1,17-17l24,24a12,12,0,0,1,0,17l-24,24a12,12,0,0,1-17-17L195,76H96a52.06,52.06,0,0,0-52,52,12,12,0,0,1-24,0Zm204-12a12,12,0,0,0-12,12,52.06,52.06,0,0,1-52,52H61l3.52-3.51a12,12,0,1,0-17-17l-24,24a12,12,0,0,0,0,17l24,24a12,12,0,1,0,17-17L61,204h99a76.08,76.08,0,0,0,76-76A12,12,0,0,0,224,116Z\"></path>"), ms = /* @__PURE__ */ Y("<path d=\"M224,64v64a64,64,0,0,1-64,64H32V128A64,64,0,0,1,96,64Z\" opacity=\"0.2\"></path><path d=\"M24,128A72.08,72.08,0,0,1,96,56H204.69L194.34,45.66a8,8,0,0,1,11.32-11.32l24,24a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L204.69,72H96a56.06,56.06,0,0,0-56,56,8,8,0,0,1-16,0Zm200-8a8,8,0,0,0-8,8,56.06,56.06,0,0,1-56,56H51.31l10.35-10.34a8,8,0,0,0-11.32-11.32l-24,24a8,8,0,0,0,0,11.32l24,24a8,8,0,0,0,11.32-11.32L51.31,200H160a72.08,72.08,0,0,0,72-72A8,8,0,0,0,224,120Z\"></path>", 1), hs = /* @__PURE__ */ Y("<path d=\"M24,128A72.08,72.08,0,0,1,96,56h96V40a8,8,0,0,1,13.66-5.66l24,24a8,8,0,0,1,0,11.32l-24,24A8,8,0,0,1,192,88V72H96a56.06,56.06,0,0,0-56,56,8,8,0,0,1-16,0Zm200-8a8,8,0,0,0-8,8,56.06,56.06,0,0,1-56,56H64V168a8,8,0,0,0-13.66-5.66l-24,24a8,8,0,0,0,0,11.32l24,24A8,8,0,0,0,64,216V200h96a72.08,72.08,0,0,0,72-72A8,8,0,0,0,224,120Z\"></path>"), gs = /* @__PURE__ */ Y("<path d=\"M26,128A70.08,70.08,0,0,1,96,58H209.51L195.76,44.24a6,6,0,0,1,8.48-8.48l24,24a6,6,0,0,1,0,8.48l-24,24a6,6,0,0,1-8.48-8.48L209.51,70H96a58.07,58.07,0,0,0-58,58,6,6,0,0,1-12,0Zm198-6a6,6,0,0,0-6,6,58.07,58.07,0,0,1-58,58H46.49l13.75-13.76a6,6,0,0,0-8.48-8.48l-24,24a6,6,0,0,0,0,8.48l24,24a6,6,0,0,0,8.48-8.48L46.49,198H160a70.08,70.08,0,0,0,70-70A6,6,0,0,0,224,122Z\"></path>"), _s = /* @__PURE__ */ Y("<path d=\"M24,128A72.08,72.08,0,0,1,96,56H204.69L194.34,45.66a8,8,0,0,1,11.32-11.32l24,24a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L204.69,72H96a56.06,56.06,0,0,0-56,56,8,8,0,0,1-16,0Zm200-8a8,8,0,0,0-8,8,56.06,56.06,0,0,1-56,56H51.31l10.35-10.34a8,8,0,0,0-11.32-11.32l-24,24a8,8,0,0,0,0,11.32l24,24a8,8,0,0,0,11.32-11.32L51.31,200H160a72.08,72.08,0,0,0,72-72A8,8,0,0,0,224,120Z\"></path>"), vs = /* @__PURE__ */ Y("<path d=\"M28,128A68.07,68.07,0,0,1,96,60H214.34L197.17,42.83a4,4,0,0,1,5.66-5.66l24,24a4,4,0,0,1,0,5.66l-24,24a4,4,0,0,1-5.66-5.66L214.34,68H96a60.07,60.07,0,0,0-60,60,4,4,0,0,1-8,0Zm196-4a4,4,0,0,0-4,4,60.07,60.07,0,0,1-60,60H41.66l17.17-17.17a4,4,0,0,0-5.66-5.66l-24,24a4,4,0,0,0,0,5.66l24,24a4,4,0,1,0,5.66-5.66L41.66,196H160a68.07,68.07,0,0,0,68-68A4,4,0,0,0,224,124Z\"></path>"), ys = /* @__PURE__ */ Y("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function bs(e, t) {
	A(t, !0);
	let n = $i(), r = /* @__PURE__ */ Xi(t, fs), i = /* @__PURE__ */ N(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ N(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ N(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ N(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = ys();
	Bi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: q(o),
		height: q(o),
		fill: q(a),
		transform: q(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = R(l), d = (e) => {
		var n = Rr();
		ni(z(n), () => t.children), X(e, n);
	};
	Z(u, (e) => {
		t.children && e(d);
	});
	var f = B(u, 2), p = (e) => {
		X(e, ps());
	}, m = (e) => {
		var t = ms();
		O(), X(e, t);
	}, h = (e) => {
		X(e, hs());
	}, g = (e) => {
		X(e, gs());
	}, _ = (e) => {
		X(e, _s());
	}, v = (e) => {
		X(e, vs());
	}, y = (e) => {
		var t = Lr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), X(e, t);
	};
	Z(f, (e) => {
		q(i) === "bold" ? e(p) : q(i) === "duotone" ? e(m, 1) : q(i) === "fill" ? e(h, 2) : q(i) === "light" ? e(g, 3) : q(i) === "regular" ? e(_, 4) : q(i) === "thin" ? e(v, 5) : e(y, -1);
	}), D(l), X(e, l), j();
}
//#endregion
//#region deskminder/src/Alert.svelte
var xs = /* @__PURE__ */ Fr("<span class=\"text-sm opacity-50\"> </span>"), Ss = /* @__PURE__ */ Fr("<div class=\"fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/75 text-base-content backdrop-blur-2xl\" data-input-region=\"\"><div class=\"flex flex-col items-center gap-4 px-12 text-center\"><span class=\"text-xs font-medium tracking-[0.3em] opacity-50\">REMINDER</span> <h1 class=\"max-w-4xl text-5xl font-bold text-balance\"> </h1></div> <div class=\"flex items-center gap-3\"><button class=\"flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-base font-medium transition hover:bg-white/25\" type=\"button\"><!> Close</button> <button class=\"flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium ring-1 ring-white/25 transition hover:bg-white/10\" type=\"button\"><!> Snooze Reminder</button> <button class=\"flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium ring-1 ring-white/25 transition hover:bg-white/10\" type=\"button\"><!> Repeat</button></div> <!></div>");
function Cs(e, t) {
	A(t, !0);
	let n = 1e4, r = { duration: 220 }, i = {
		y: 96,
		duration: 420,
		easing: qo
	}, a = /* @__PURE__ */ F(nn([])), o = /* @__PURE__ */ N(() => q(a).filter((e) => e.firedAt !== 0).sort((e, t) => e.firedAt - t.firedAt)), s = /* @__PURE__ */ N(() => c(q(o)));
	Sn(() => t.bus.subscribe("reminders", (e) => {
		I(a, go(e.data), !0);
	}));
	function c(e) {
		return e.length === 0 ? null : e[0];
	}
	function l(e) {
		return e.text === "" ? uo(e.dueAt) : e.text;
	}
	function u(e) {
		t.bus.call("reminder:dismiss", { id: e.id }, n);
	}
	function d(e) {
		t.bus.call("reminder:snooze", { id: e.id }, n);
	}
	function f(e) {
		t.bus.call("reminder:repeat", { id: e.id }, n);
	}
	function p(e) {
		q(s) !== null && e.key === "Escape" && (e.preventDefault(), u(q(s)));
	}
	function m(e) {
		e.focus();
	}
	var h = Rr();
	Dr("keydown", on, p);
	var g = z(h), _ = (e) => {
		let t = /* @__PURE__ */ N(() => q(s));
		var n = Ss(), a = R(n), c = B(R(a), 2), p = R(c, !0);
		D(c), D(a);
		var h = B(a, 2), g = R(h);
		ds(R(g), { class: "size-5 opacity-70" }), O(), D(g), pi(g, (e) => m?.(e));
		var _ = B(g, 2);
		ns(R(_), { class: "size-5 opacity-70" }), O(), D(_);
		var v = B(_, 2);
		bs(R(v), { class: "size-5 opacity-70" }), O(), D(v), D(h);
		var y = B(h, 2), b = (e) => {
			var t = xs(), n = R(t);
			D(t), On(() => Br(n, `${q(o).length - 1} more waiting`)), X(e, t);
		};
		Z(y, (e) => {
			q(o).length > 1 && e(b);
		}), D(n), On((e) => Br(p, e), [() => l(q(t))]), di(3, a, () => Ko, () => i), J("click", g, () => u(q(t))), J("click", _, () => d(q(t))), J("click", v, () => f(q(t))), di(3, h, () => Ko, () => i), di(3, n, () => Go, () => r), X(e, n);
	};
	Z(g, (e) => {
		q(s) !== null && e(_);
	}), X(e, h), j();
}
Or(["click"]);
//#endregion
//#region deskminder/src/views.ts
var ws = {
	name: "deskminder-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = xo(e, "ui"), n = xo(e, "bus");
		e.effect(() => Ds()), e.effect(() => t.register("deskminder.pill", Ts(Vo, { bus: n }))), e.effect(() => t.register("deskminder.alert", Ts(Cs, { bus: n })));
	}
};
function Ts(e, t) {
	return (n) => {
		let r = Vr(e, {
			target: n,
			props: t
		});
		return { dispose() {
			Gr(r);
		} };
	};
}
function Es(e) {
	let t = e.indexOf("?");
	return t < 0 ? "" : e.slice(t);
}
function Ds() {
	if (Os()) return () => {};
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = `/plugins/deskminder/views.css${Es(import.meta.url)}`, document.head.appendChild(e), () => {
		e.remove();
	};
}
function Os() {
	return new URL(import.meta.url).origin !== window.location.origin;
}
//#endregion
export { ws as default };
