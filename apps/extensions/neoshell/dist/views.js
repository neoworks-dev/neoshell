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
var h = 1 << 24, g = 1024, _ = 2048, v = 4096, y = 8192, b = 16384, x = 32768, S = 1 << 25, C = 65536, w = 1 << 19, ee = 1 << 20, te = 1 << 25, ne = 65536, re = 1 << 21, ie = 1 << 22, ae = 1 << 23, oe = Symbol("$state"), se = Symbol("legacy props"), ce = Symbol(""), le = Symbol("attributes"), ue = Symbol("class"), de = Symbol("style"), fe = Symbol("text"), pe = Symbol("form reset"), me = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), he = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function ge(e) {
	throw Error("https://svelte.dev/e/lifecycle_outside_component");
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/errors.js
function _e() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function ve(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function ye(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function be() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function xe(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function Se() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Ce(e) {
	throw Error("https://svelte.dev/e/props_invalid_value");
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
var Oe = {}, T = Symbol("uninitialized"), ke = "http://www.w3.org/1999/xhtml";
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
var E = !1;
function Pe(e) {
	E = e;
}
var D;
function Fe(e) {
	if (e === null) throw je(), Oe;
	return D = e;
}
function Ie() {
	return Fe(/* @__PURE__ */ mn(D));
}
function O(e) {
	if (E) {
		if (/* @__PURE__ */ mn(D) !== null) throw je(), Oe;
		D = e;
	}
}
function Le(e = 1) {
	if (E) {
		for (var t = e, n = D; t--;) n = /* @__PURE__ */ mn(n);
		D = n;
	}
}
function Re(e = !0) {
	for (var t = 0, n = D;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ mn(n);
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
var k = null;
function Ue(e) {
	k = e;
}
function We(e) {
	return Ye("getContext").get(e);
}
function Ge(e) {
	return Ye("hasContext").has(e);
}
function Ke(e, t = !1, n) {
	k = {
		p: k,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: H,
		l: null
	};
}
function qe(e) {
	var t = k, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) Tn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, k = t.p, e ?? {};
}
function Je() {
	return !0;
}
function Ye(e) {
	return k === null && ge(e), k.c ??= new Map(Xe(k) || void 0);
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
	Ze = [], p(e);
}
function $e(e) {
	if (Ze.length === 0 && !Ft) {
		var t = Ze;
		queueMicrotask(() => {
			t === Ze && Qe();
		});
	}
	Ze.push(e);
}
function et() {
	for (; Ze.length > 0;) Qe();
}
function tt(e) {
	var t = H;
	if (t === null) return V.f |= ae, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	nt(e, t);
}
function nt(e, t) {
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
var rt = ~(_ | v | g);
function A(e, t) {
	e.f = e.f & rt | t;
}
function it(e) {
	e.f & 512 || e.deps === null ? A(e, g) : A(e, v);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/utils.js
function at(e) {
	if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || (t.f ^= ne, at(t.deps));
}
function ot(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), at(e.deps), A(e, g);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/store.js
var st = !1;
function ct(e) {
	var t = st;
	try {
		return st = !1, [e(), st];
	} finally {
		st = t;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/misc.js
function lt(e, t) {
	if (t) {
		let t = document.body;
		e.autofocus = !0, $e(() => {
			document.activeElement === t && e.focus();
		});
	}
}
var ut = !1;
function dt() {
	ut || (ut = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[pe]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function ft(e) {
	var t = V, n = H;
	Jn(null), Yn(null);
	try {
		return e();
	} finally {
		Jn(t), Yn(n);
	}
}
function pt(e, t, n, r = n) {
	e.addEventListener(t, () => ft(n));
	let i = e[pe];
	e[pe] = i ? () => {
		i(), r(!0);
	} : () => r(!0), dt();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/reactivity/create-subscriber.js
function mt(e) {
	let t = 0, n = Qt(0), r;
	return () => {
		Sn() && (U(n), kn(() => (t === 0 && (r = gr(() => e(() => nn(n)))), t += 1, () => {
			$e(() => {
				--t, t === 0 && (r?.(), r = void 0, nn(n));
			});
		})));
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var ht = C | w;
function gt(e, t, n, r) {
	new _t(e, t, n, r);
}
var _t = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = E ? D : null;
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
	#h = mt(() => (this.#m = Qt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = H;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = H.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = An(() => {
			if (E) {
				let e = this.#t;
				Ie();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, ht), E && (this.#e = D);
	}
	#g() {
		try {
			this.#a = Mn(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		$e(r), t && (this.#s = Mn(() => {
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
			t = !0, n && De(), this.#s !== null && Rn(this.#s, () => {
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
					nt(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = Mn(() => e(this.#e)), $e(() => {
			var e = this.#c = document.createDocumentFragment(), t = fn();
			e.append(t), this.#a = this.#S(() => Mn(() => this.#r(t))), this.#u === 0 && (this.#e.before(e), this.#c = null, Rn(this.#o, () => {
				this.#o = null;
			}), this.#x(M));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = Mn(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				Hn(this.#a, e);
				let t = this.#n.pending;
				this.#o = Mn(() => t(this.#e));
			} else this.#x(M);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		ot(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = H, n = V, r = k;
		Yn(this.#i), Jn(this.#i), Ue(this.#i.ctx);
		try {
			return Vt.ensure(), e();
		} catch (e) {
			return tt(e), null;
		} finally {
			Yn(t), Jn(n), Ue(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && Rn(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, $e(() => {
			this.#d = !1, this.#m && en(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), U(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		M?.is_fork ? (this.#a && M.skip_effect(this.#a), this.#o && M.skip_effect(this.#o), this.#s && M.skip_effect(this.#s), M.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (B(this.#a), null), this.#o &&= (B(this.#o), null), this.#s &&= (B(this.#s), null), E && (Fe(this.#t), Le(), Fe(Re()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return Mn(() => {
						var r = H;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return nt(e, this.#i.parent), null;
				}
			}));
		};
		$e(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				nt(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => nt(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/async.js
function vt(e, t, n, r) {
	let i = Je() ? St : Tt;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = H, c = yt(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				nt(e, s);
			}
			bt();
		}
	}
	var d = xt();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ wt(e))).then(u).catch((e) => nt(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), bt();
	}) : f();
}
function yt() {
	var e = H, t = V, n = k, r = M;
	return function(i = !0) {
		Yn(e), Jn(t), Ue(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function bt(e = !0) {
	Yn(null), Jn(null), Ue(null), e && M?.deactivate();
}
function xt() {
	var e = H, t = e.b, n = M, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function St(e) {
	var t = 2 | _;
	return H !== null && (H.f |= w), {
		ctx: k,
		deps: null,
		effects: null,
		equals: Be,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: T,
		wv: 0,
		parent: H,
		ac: null
	};
}
var Ct = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function wt(e, t, n) {
	let r = H;
	r === null && _e();
	var i = void 0, a = Qt(T), o = !V, s = /* @__PURE__ */ new Set();
	return On(() => {
		var t = H, n = m();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== me && n.reject(e);
			}).finally(bt);
		} catch (e) {
			n.reject(e), bt();
		}
		var c = M;
		if (o) {
			if (t.f & 32768) var l = xt();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(Ct);
			else for (let e of s.values()) e.reject(Ct);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== Ct && (c.activate(), t ? (a.f |= ae, en(a, t)) : (a.f & 8388608 && (a.f ^= ae), en(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), Cn(() => {
		for (let e of s) e.reject(Ct);
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
function j(e) {
	let t = /* @__PURE__ */ St(e);
	return Zn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function Tt(e) {
	let t = /* @__PURE__ */ St(e);
	return t.equals = He, t;
}
function Et(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) B(t[n]);
	}
}
function Dt(e) {
	var t, n = H, r = e.parent;
	if (!Gn && r !== null && e.v !== T && r.f & 24576) return Ae(), e.v;
	Yn(r);
	try {
		e.f &= ~ne, Et(e), t = lr(e);
	} finally {
		Yn(n);
	}
	return t;
}
function Ot(e) {
	var t = Dt(e);
	if (!e.equals(t) && (e.wv = or(), (!M?.is_fork || e.deps === null) && (M === null ? e.v = t : (M.capture(e, t, !0), Mt?.capture(e, t, !0)), e.deps === null))) {
		A(e, g);
		return;
	}
	Gn || (Nt === null ? it(e) : (Sn() || M?.is_fork) && Nt.set(e, t));
}
function kt(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && ft(() => {
		t.ac.abort(me), t.ac = null;
	}), t.fn !== null && (t.teardown = f), dr(t, 0), Pn(t));
}
function At(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && fr(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/batch.js
var jt = null, M = null, Mt = null, Nt = null, Pt = null, Ft = !1, It = !1, Lt = null, Rt = null, zt = 0, Bt = 1, Vt = class e {
	id = Bt++;
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
		jt === null ? jt = this : (jt.#n = this, this.#t = jt), jt = this;
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
			for (var r of n.d) A(r, _), t(r);
			for (r of n.m) A(r, v), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		this.#e = !0, zt++ > 1e3 && (this.#x(), Ut());
		for (let e of this.#u) this.#d.delete(e), A(e, _), this.schedule(e);
		for (let e of this.#d) A(e, v), this.schedule(e);
		let t = this.#c;
		this.#c = [], this.apply();
		var n = Lt = [], r = [], i = Rt = [];
		for (let e of t) try {
			this.#_(e, n, r);
		} catch (t) {
			throw Jt(e), this.#h() || this.discard(), t;
		}
		if (M = null, i.length > 0) {
			var a = e.ensure();
			for (let e of i) a.schedule(e);
		}
		if (Lt = null, Rt = null, this.#h()) {
			this.#b(r), this.#b(n);
			for (let [e, t] of this.#f) qt(e, t);
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
		this.#r.clear(), Mt = this, Gt(r), Gt(n), Mt = null, this.#s?.resolve();
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
		e.f ^= g;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= g : i & 4 ? t.push(r) : sr(r) && (i & 16 && this.#d.add(r), fr(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), A(i, _), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#x(), M = this, this.#g();
	}
	#b(e) {
		for (var t = 0; t < e.length; t += 1) ot(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== T && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), Nt?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		M = this;
	}
	deactivate() {
		M = null, Nt = null;
	}
	flush() {
		try {
			It = !0, M = this, this.#g();
		} finally {
			zt = 0, Pt = null, Lt = null, Rt = null, It = !1, M = null, Nt = null, Xt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(Ct);
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
		this.#m || (this.#m = !0, $e(() => {
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
		if (M === null) {
			let t = M = new e();
			!It && !Ft && $e(() => {
				t.#e || t.flush();
			});
		}
		return M;
	}
	apply() {
		Nt = null;
	}
	schedule(e) {
		if (Pt = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		for (var t = e; t.parent !== null;) {
			t = t.parent;
			var n = t.f;
			if (Lt !== null && t === H && (V === null || !(V.f & 2))) return;
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
			e === null || (e.#n = t), t === null ? jt = e : t.#t = e, this.linked = !1;
		}
	}
};
function Ht(e) {
	var t = Ft;
	Ft = !0;
	try {
		var n;
		for (e && (M !== null && !M.is_fork && M.flush(), n = e());;) {
			if (et(), M === null) return n;
			M.flush();
		}
	} finally {
		Ft = t;
	}
}
function Ut() {
	try {
		Se();
	} catch (e) {
		nt(e, Pt);
	}
}
var Wt = null;
function Gt(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && sr(r) && (Wt = /* @__PURE__ */ new Set(), fr(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && Ln(r), Wt?.size > 0)) {
				Xt.clear();
				for (let e of Wt) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) Wt.has(n) && (Wt.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || fr(n);
					}
				}
				Wt.clear();
			}
		}
		Wt = null;
	}
}
function Kt(e) {
	M.schedule(e);
}
function qt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), A(e, g);
		for (var n = e.first; n !== null;) qt(n, t), n = n.next;
	}
}
function Jt(e) {
	A(e, g);
	for (var t = e.first; t !== null;) Jt(t), t = t.next;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/sources.js
var Yt = /* @__PURE__ */ new Set(), Xt = /* @__PURE__ */ new Map(), Zt = !1;
function Qt(e, t) {
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
function N(e, t) {
	let n = Qt(e, t);
	return Zn(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function $t(e, t = !1, n = !0) {
	let r = Qt(e);
	return t || (r.equals = He), r;
}
function P(e, t, n = !1) {
	return V !== null && (!qn || V.f & 131072) && Je() && V.f & 4325394 && (Xn === null || !Xn.has(e)) && Ee(), en(e, n ? F(t) : t, Rt);
}
function en(e, t, n = null) {
	if (!e.equals(t)) {
		Xt.set(e, Gn ? t : e.v);
		var r = Vt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && Dt(t), Nt === null && it(t);
		}
		e.wv = or(), rn(e, _, n), Je() && H !== null && H.f & 1024 && !(H.f & 96) && (er === null ? tr([e]) : er.push(e)), !r.is_fork && Yt.size > 0 && !Zt && tn();
	}
	return t;
}
function tn() {
	Zt = !1;
	for (let e of Yt) {
		e.f & 1024 && A(e, v);
		let t;
		try {
			t = sr(e);
		} catch {
			t = !0;
		}
		t && fr(e);
	}
	Yt.clear();
}
function nn(e) {
	P(e, e.v + 1);
}
function rn(e, t, n) {
	var r = e.reactions;
	if (r !== null) for (var i = Je(), a = r.length, o = 0; o < a; o++) {
		var s = r[o], c = s.f;
		if (!(!i && s === H)) {
			var l = (c & _) === 0;
			if (l && A(s, t), c & 131072) Yt.add(s);
			else if (c & 2) {
				var u = s;
				Nt?.delete(u), c & 65536 || (c & 512 && (H === null || !(H.f & 2097152)) && (s.f |= ne), rn(u, v, n));
			} else if (l) {
				var d = s;
				c & 16 && Wt !== null && Wt.add(d), n === null ? Kt(d) : n.push(d);
			}
		}
	}
}
function F(t) {
	if (typeof t != "object" || !t || oe in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ N(0), u = null, d = ir, f = (e) => {
		if (ir === d) return e();
		var t = V, n = ir;
		Jn(null), ar(d);
		var r = e();
		return Jn(t), ar(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ N(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && we();
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
					let e = f(() => /* @__PURE__ */ N(T, u));
					r.set(t, e), nn(o);
				}
			} else P(n, T), nn(o);
			return !0;
		},
		get(e, n, i) {
			if (n === oe) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ N(F(s ? e[n] : T), u)), r.set(n, o)), o !== void 0) {
				var c = U(o);
				return c === T ? void 0 : c;
			}
			return Reflect.get(e, n, i);
		},
		getOwnPropertyDescriptor(e, t) {
			var n = Reflect.getOwnPropertyDescriptor(e, t);
			if (n && "value" in n) {
				var i = r.get(t);
				i && (n.value = U(i));
			} else if (n === void 0) {
				var a = r.get(t), o = a?.v;
				if (a !== void 0 && o !== T) return {
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
			var n = r.get(t), i = n !== void 0 && n.v !== T || Reflect.has(e, t);
			return (n !== void 0 || H !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ N(i ? F(e[t]) : T, u)), r.set(t, n)), U(n) === T) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ N(T, u)), r.set(d + "", p)) : P(p, T);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ N(void 0, u)), P(c, F(n)), r.set(t, c));
			else {
				l = c.v !== T;
				var m = f(() => F(n));
				P(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && P(g, _ + 1);
				}
				nn(o);
			}
			return !0;
		},
		ownKeys(e) {
			U(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== T;
			});
			for (var [n, i] of r) i.v !== T && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			Te();
		}
	});
}
function an(e) {
	try {
		if (typeof e == "object" && e && oe in e) return e[oe];
	} catch {}
	return e;
}
function on(e, t) {
	return Object.is(an(e), an(t));
}
var sn, cn, ln, un;
function dn() {
	if (sn === void 0) {
		sn = window, cn = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		ln = a(t, "firstChild").get, un = a(t, "nextSibling").get, u(e) && (e[ue] = void 0, e[le] = null, e[de] = void 0, e.__e = void 0), u(n) && (n[fe] = void 0);
	}
}
function fn(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function pn(e) {
	return ln.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function mn(e) {
	return un.call(e);
}
function I(e, t) {
	if (!E) return /* @__PURE__ */ pn(e);
	var n = /* @__PURE__ */ pn(D);
	if (n === null) n = D.appendChild(fn());
	else if (t && n.nodeType !== 3) {
		var r = fn();
		return n?.before(r), Fe(r), r;
	}
	return t && vn(n), Fe(n), n;
}
function L(e, t = !1) {
	if (!E) {
		var n = /* @__PURE__ */ pn(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ mn(n) : n;
	}
	if (t) {
		if (D?.nodeType !== 3) {
			var r = fn();
			return D?.before(r), Fe(r), r;
		}
		vn(D);
	}
	return D;
}
function R(e, t = 1, n = !1) {
	let r = E ? D : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ mn(r);
	if (!E) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = fn();
			return r === null ? i?.after(a) : r.before(a), Fe(a), a;
		}
		vn(r);
	}
	return Fe(r), r;
}
function hn(e) {
	e.textContent = "";
}
function gn() {
	return !1;
}
function _n(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function vn(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/effects.js
function yn(e) {
	H === null && (V === null && xe(e), be()), Gn && ye(e);
}
function bn(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function xn(e, t) {
	var n = H;
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
	M?.register_created_effect(r);
	var i = r;
	if (e & 4) Lt === null ? Vt.ensure().schedule(r) : Lt.push(r);
	else if (t !== null) {
		try {
			fr(r);
		} catch (e) {
			throw B(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= C));
	}
	if (i !== null && (i.parent = n, n !== null && bn(i, n), V !== null && V.f & 2 && !(e & 64))) {
		var a = V;
		(a.effects ??= []).push(i);
	}
	return r;
}
function Sn() {
	return V !== null && !qn;
}
function Cn(e) {
	let t = xn(8, null);
	return A(t, g), t.teardown = e, t;
}
function wn(e) {
	yn("$effect");
	var t = H.f;
	if (!V && t & 32 && k !== null && !k.i) {
		var n = k;
		(n.e ??= []).push(e);
	} else return Tn(e);
}
function Tn(e) {
	return xn(4 | ee, e);
}
function En(e) {
	Vt.ensure();
	let t = xn(64 | w, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? Rn(t, () => {
			B(t), n(void 0);
		}) : (B(t), n(void 0));
	});
}
function Dn(e) {
	return xn(4, e);
}
function On(e) {
	return xn(ie | w, e);
}
function kn(e, t = 0) {
	return xn(8 | t, e);
}
function z(e, t = [], n = [], r = []) {
	vt(r, t, n, (t) => {
		xn(8, () => {
			e(...t.map(U));
		});
	});
}
function An(e, t = 0) {
	return xn(16 | t, e);
}
function jn(e, t = 0) {
	return xn(h | t, e);
}
function Mn(e) {
	return xn(32 | w, e);
}
function Nn(e) {
	var t = e.teardown;
	if (t !== null) {
		let e = Gn, n = V;
		Kn(!0), Jn(null);
		try {
			t.call(null);
		} finally {
			Kn(e), Jn(n);
		}
	}
}
function Pn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && ft(() => {
			e.abort(me);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : B(n, t), n = r;
	}
}
function Fn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || B(t), t = n;
	}
}
function B(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (In(e.nodes.start, e.nodes.end), n = !0), e.f |= S, Pn(e, t && !n), dr(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	Nn(e), e.f ^= S, e.f |= b;
	var i = e.parent;
	i !== null && i.first !== null && Ln(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function In(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ mn(e);
		e.remove(), e = n;
	}
}
function Ln(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function Rn(e, t, n = !0) {
	var r = [];
	zn(e, r, !0);
	var i = () => {
		n && B(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function zn(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= y;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				zn(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function Bn(e) {
	Vn(e, !0);
}
function Vn(e, t) {
	if (e.f & 8192) {
		e.f ^= y, e.f & 1024 || (A(e, _), Vt.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			Vn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function Hn(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ mn(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/legacy.js
var Un = null, Wn = !1, Gn = !1;
function Kn(e) {
	Gn = e;
}
var V = null, qn = !1;
function Jn(e) {
	V = e;
}
var H = null;
function Yn(e) {
	H = e;
}
var Xn = null;
function Zn(e) {
	V !== null && (Xn ??= /* @__PURE__ */ new Set()).add(e);
}
var Qn = null, $n = 0, er = null;
function tr(e) {
	er = e;
}
var nr = 1, rr = 0, ir = rr;
function ar(e) {
	ir = e;
}
function or() {
	return ++nr;
}
function sr(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 2 && (e.f &= ~ne), t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (sr(a) && Ot(a), a.wv > e.wv) return !0;
		}
		t & 512 && Nt === null && A(e, g);
	}
	return !1;
}
function cr(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(Xn !== null && Xn.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? cr(a, t, !1) : t === a && (n ? A(a, _) : a.f & 1024 && A(a, v), Kt(a));
	}
}
function lr(e) {
	var t = Qn, n = $n, r = er, i = V, a = Xn, o = k, s = qn, c = ir, l = e.f;
	Qn = null, $n = 0, er = null, V = l & 96 ? null : e, Xn = null, Ue(e.ctx), qn = !1, ir = ++rr, e.ac !== null && (ft(() => {
		e.ac.abort(me);
	}), e.ac = null);
	try {
		e.f |= re;
		var u = e.fn, d = u();
		e.f |= x;
		var f = e.deps, p = M?.is_fork;
		if (Qn !== null) {
			var m;
			if (p || dr(e, $n), f !== null && $n > 0) for (f.length = $n + Qn.length, m = 0; m < Qn.length; m++) f[$n + m] = Qn[m];
			else e.deps = f = Qn;
			if (Sn() && e.f & 512) for (m = $n; m < f.length; m++) (f[m].reactions ??= []).push(e);
		} else !p && f !== null && $n < f.length && (dr(e, $n), f.length = $n);
		if (Je() && er !== null && !qn && f !== null && !(e.f & 6146)) for (m = 0; m < er.length; m++) cr(er[m], e);
		if (i !== null && i !== e) {
			if (rr++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = rr;
			if (t !== null) for (let e of t) e.rv = rr;
			er !== null && (r === null ? r = er : r.push(...er));
		}
		return e.f & 8388608 && (e.f ^= ae), d;
	} catch (e) {
		return tt(e);
	} finally {
		e.f ^= re, Qn = t, $n = n, er = r, V = i, Xn = a, Ue(o), qn = s, ir = c;
	}
}
function ur(e, r) {
	let i = r.reactions;
	if (i !== null) {
		var a = t.call(i, e);
		if (a !== -1) {
			var o = i.length - 1;
			o === 0 ? i = r.reactions = null : (i[a] = i[o], i.pop());
		}
	}
	if (i === null && r.f & 2 && (Qn === null || !n.call(Qn, r))) {
		var s = r;
		s.f & 512 && (s.f ^= 512, s.f &= ~ne), s.v !== T && it(s), s.ac !== null && ft(() => {
			s.ac.abort(me), s.ac = null, A(s, _);
		}), kt(s), dr(s, 0);
	}
}
function dr(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) ur(e, n[r]);
}
function fr(e) {
	var t = e.f;
	if (!(t & 16384)) {
		A(e, g);
		var n = H, r = Wn;
		H = e, Wn = !(t & 96);
		try {
			t & 16777232 ? Fn(e) : Pn(e), Nn(e);
			var i = lr(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = nr;
		} finally {
			Wn = r, H = n;
		}
	}
}
async function pr() {
	await Promise.resolve(), Ht();
}
function U(e) {
	var t = !!(e.f & 2);
	if (Un?.add(e), V !== null && !qn && !(H !== null && H.f & 16384) && (Xn === null || !Xn.has(e))) {
		var r = V.deps;
		if (V.f & 2097152) e.rv < rr && (e.rv = rr, Qn === null && r !== null && r[$n] === e ? $n++ : Qn === null ? Qn = [e] : Qn.push(e));
		else {
			V.deps ??= [], n.call(V.deps, e) || V.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [V] : n.call(i, V) || i.push(V);
		}
	}
	if (Gn && Xt.has(e)) return Xt.get(e);
	if (t) {
		var a = e;
		if (Gn) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || hr(a)) && (o = Dt(a)), Xt.set(a, o), o;
		}
		var s = !(a.f & 512) && !qn && V !== null && (Wn || !!(V.f & 512)), c = (a.f & x) === 0;
		sr(a) && (s && (a.f |= 512), Ot(a)), s && !c && (At(a), mr(a));
	}
	if (Nt?.has(e)) return Nt.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function mr(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (At(t), mr(t));
}
function hr(e) {
	if (e.v === T) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (Xt.has(t) || t.f & 2 && hr(t)) return !0;
	return !1;
}
function gr(e) {
	var t = qn;
	try {
		return qn = !0, e();
	} finally {
		qn = t;
	}
}
function _r(e) {
	if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
		if (oe in e) vr(e);
		else if (!Array.isArray(e)) for (let t in e) {
			let n = e[t];
			typeof n == "object" && n && oe in n && vr(n);
		}
	}
}
function vr(e, t = /* @__PURE__ */ new Set()) {
	if (typeof e == "object" && e && !(e instanceof EventTarget) && !t.has(e)) {
		t.add(e), e instanceof Date && e.getTime();
		for (let n in e) try {
			vr(e[n], t);
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
function yr(e) {
	return e.endsWith("capture") && e !== "gotpointercapture" && e !== "lostpointercapture";
}
var br = [
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
function xr(e) {
	return br.includes(e);
}
var Sr = /* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split("."), Cr = {
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
function wr(e) {
	return e = e.toLowerCase(), Cr[e] ?? e;
}
[...Sr];
var Tr = ["touchstart", "touchmove"];
function Er(e) {
	return Tr.includes(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/events.js
var Dr = Symbol("events"), Or = /* @__PURE__ */ new Set(), kr = /* @__PURE__ */ new Set();
function Ar(e) {
	if (!E) return;
	e.removeAttribute("onload"), e.removeAttribute("onerror");
	let t = e.__e;
	t !== void 0 && (e.__e = void 0, queueMicrotask(() => {
		e.isConnected && e.dispatchEvent(t);
	}));
}
function jr(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || Fr.call(t, e), !e.cancelBubble) return ft(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? $e(() => {
		t.addEventListener(e, i, r);
	}) : t.addEventListener(e, i, r), i;
}
function Mr(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = jr(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && Cn(() => {
		t.removeEventListener(e, o, a);
	});
}
function W(e, t, n) {
	(t[Dr] ??= {})[e] = n;
}
function Nr(e) {
	for (var t = 0; t < e.length; t++) Or.add(e[t]);
	for (var n of kr) n(e);
}
var Pr = null;
function Fr(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	Pr = e;
	var s = 0, c = Pr === e && e[Dr];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[Dr] = t;
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
		var d = V, f = H;
		Jn(null), Yn(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[Dr]?.[r];
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
			e[Dr] = t, delete e.currentTarget, Jn(d), Yn(f);
		}
	}
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/reconciler.js
var Ir = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function Lr(e) {
	return Ir?.createHTML(e) ?? e;
}
function Rr(e) {
	var t = _n("template");
	return t.innerHTML = Lr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/template.js
function zr(e, t) {
	var n = H;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function G(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (E) return zr(D, null), D;
		i === void 0 && (i = Rr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ pn(i)));
		var t = r || cn ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ pn(t), s = t.lastChild;
			zr(o, s);
		} else zr(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function Br(e, t, n = "svg") {
	var r = !e.startsWith("<!>"), i = !!(t & 1), a = `<${n}>${r ? e : "<!>" + e}</${n}>`, o;
	return () => {
		if (E) return zr(D, null), D;
		if (!o) {
			var e = /* @__PURE__ */ pn(Rr(a));
			if (i) for (o = document.createDocumentFragment(); /* @__PURE__ */ pn(e);) o.appendChild(/* @__PURE__ */ pn(e));
			else o = /* @__PURE__ */ pn(e);
		}
		var t = o.cloneNode(!0);
		if (i) {
			var n = /* @__PURE__ */ pn(t), r = t.lastChild;
			zr(n, r);
		} else zr(t, t);
		return t;
	};
}
/*#__NO_SIDE_EFFECTS__*/
function K(e, t) {
	return /* @__PURE__ */ Br(e, t, "svg");
}
function Vr(e = "") {
	if (!E) {
		var t = fn(e + "");
		return zr(t, t), t;
	}
	var n = D;
	return n.nodeType === 3 ? vn(n) : (n.before(n = fn()), Fe(n)), zr(n, n), n;
}
function Hr() {
	if (E) return zr(D, null), D;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = fn();
	return e.append(t, n), zr(t, n), e;
}
function q(e, t) {
	if (E) {
		var n = H;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = D), Ie();
		return;
	}
	e !== null && e.before(t);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/render.js
var Ur = !0;
function J(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[fe] ??= e.nodeValue) && (e[fe] = n, e.nodeValue = `${n}`);
}
function Wr(e, t) {
	return Kr(e, t);
}
var Gr = /* @__PURE__ */ new Map();
function Kr(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	dn();
	var l = void 0, u = En(() => {
		var u = n ?? t.appendChild(fn());
		gt(u, { pending: () => {} }, (t) => {
			Ke({});
			var n = k;
			if (o && (n.c = o), a && (i.$$events = a), E && zr(t, null), Ur = s, l = e(t, i) || {}, Ur = !0, E && (H.nodes.end = D, D === null || D.nodeType !== 8 || D.data !== "]")) throw je(), Oe;
			qe();
		}, c);
		var d = /* @__PURE__ */ new Set(), f = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!d.has(r)) {
					d.add(r);
					var i = Er(r);
					for (let e of [t, document]) {
						var a = Gr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), Gr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, Fr, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return f(r(Or)), kr.add(f), () => {
			for (var e of d) for (let n of [t, document]) {
				var r = Gr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, Fr), r.delete(e), r.size === 0 && Gr.delete(n)) : r.set(e, i);
			}
			kr.delete(f), u !== n && u.parentNode?.removeChild(u);
		};
	});
	return qr.set(l, u), l;
}
var qr = /* @__PURE__ */ new WeakMap();
function Jr(e, t) {
	let n = qr.get(e);
	return n ? (qr.delete(e), n(t)) : Promise.resolve();
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var Yr = class {
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
			if (n) Bn(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (Bn(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
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
						Hn(r, t), t.append(fn()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else B(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), Rn(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (B(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = M, r = gn();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = fn();
				i.append(a), this.#n.set(e, {
					effect: Mn(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, Mn(() => t(this.anchor)));
		}
		if (this.#e.set(n, e), r) {
			for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(this.#a), n.ondiscard(this.#o);
		} else E && (this.anchor = D), this.#a(n);
	}
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/if.js
function Y(e, t, n = !1) {
	var r;
	E && (r = D, Ie());
	var i = new Yr(e), a = n ? C : 0;
	function o(e, t) {
		if (E) {
			var n = ze(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Re();
				Fe(a), i.anchor = a, Pe(!1), i.ensure(e, t), Pe(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	An(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/each.js
function Xr(e, t) {
	return t;
}
function Zr(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		Rn(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					Qr(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = i.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			hn(d), d.append(u), e.items.clear();
		}
		Qr(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function Qr(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= te, Hn(a, document.createDocumentFragment())) : B(t[i], n);
	}
}
var $r;
function ei(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = E ? Fe(/* @__PURE__ */ pn(u)) : u.appendChild(fn());
	}
	E && Ie();
	var d = null, f = /* @__PURE__ */ Tt(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, ni(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= te, ii(d, null, c)) : Bn(d) : Rn(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: An(() => {
			p = U(f);
			var e = p.length;
			let t = !1;
			E && ze(c) === "[!" != (e === 0) && (c = Re(), Fe(c), Pe(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = M, v = gn(), y = 0; y < e; y += 1) {
				E && D.nodeType === 8 && D.data === "]" && (c = D, t = !0, Pe(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && en(S.v, b), S.i && en(S.i, y), v && u.unskip_effect(S.e)) : (S = ri(l, h ? c : $r ??= fn(), b, x, y, o, n, i), h || (S.e.f |= te), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = Mn(() => s(c)) : (d = Mn(() => s($r ??= fn())), d.f |= te)), e > r.size && ve("", "", ""), E && e > 0 && Fe(Re()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && Pe(!0), U(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, E && (c = D);
}
function ti(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function ni(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = ti(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (Bn(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= te, _ === l) ii(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), ai(e, d, _), ai(e, _, y), ii(_, y, n), d = _, p = [], m = [], l = ti(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], C = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) ii(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					ai(e, S.prev, C.next), ai(e, d, S), ai(e, C, b), l = b, d = C, --v, p = [], m = [];
				} else u.delete(_), ii(_, l, n), ai(e, _.prev, _.next), ai(e, _, d === null ? e.effect.first : d.next), ai(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = ti(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = ti(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (Qr(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var w = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || w.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && w.push(l), l = ti(l.next);
		var ee = w.length;
		if (ee > 0) {
			var ne = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < ee; v += 1) w[v].nodes?.a?.measure();
				for (v = 0; v < ee; v += 1) w[v].nodes?.a?.fix();
			}
			Zr(e, w, ne);
		}
	}
	o && $e(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function ri(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Qt(n) : /* @__PURE__ */ $t(n, !1, !1) : null, l = o & 2 ? Qt(i) : null;
	return {
		v: c,
		i: l,
		e: Mn(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function ii(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ mn(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function ai(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/blocks/snippet.js
function oi(e, t, ...n) {
	var r = new Yr(e);
	An(() => {
		let e = t() ?? null;
		r.ensure(e, e && ((t) => e(t, ...n)));
	}, C);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/timing.js
var si = () => performance.now(), ci = {
	tick: (e) => requestAnimationFrame(e),
	now: () => si(),
	tasks: /* @__PURE__ */ new Set()
};
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/loop.js
function li() {
	let e = ci.now();
	ci.tasks.forEach((t) => {
		t.c(e) || (ci.tasks.delete(t), t.f());
	}), ci.tasks.size !== 0 && ci.tick(li);
}
function ui(e) {
	let t;
	return ci.tasks.size === 0 && ci.tick(li), {
		promise: new Promise((n) => {
			ci.tasks.add(t = {
				c: e,
				f: n
			});
		}),
		abort() {
			ci.tasks.delete(t);
		}
	};
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/transitions.js
function di(e, t) {
	ft(() => {
		e.dispatchEvent(new CustomEvent(t));
	});
}
function fi(e) {
	if (e === "float") return "cssFloat";
	if (e === "offset") return "cssOffset";
	if (e.startsWith("--")) return e;
	let t = e.split("-");
	return t.length === 1 ? t[0] : t[0] + t.slice(1).map((e) => e[0].toUpperCase() + e.slice(1)).join("");
}
function pi(e) {
	let t = {}, n = e.split(";");
	for (let e of n) {
		let [n, r] = e.split(":");
		if (!n || r === void 0) break;
		let i = fi(n.trim());
		t[i] = r.trim();
	}
	return t;
}
var mi = (e) => e;
function hi(e, t, n, r) {
	var i = !!(e & 1), a = !!(e & 2), o = i && a, s = !!(e & 4), c = o ? "both" : i ? "in" : "out", l, u = t.inert, d = t.style.overflow, f, p;
	function m() {
		return ft(() => l ??= n()(t, r?.() ?? {}, { direction: c }));
	}
	var h = {
		is_global: s,
		in() {
			if (t.inert = u, !i) {
				p?.abort(), p?.reset?.();
				return;
			}
			a || f?.abort(), f = gi(t, m(), p, 1, () => {
				di(t, "introstart");
			}, () => {
				di(t, "introend"), f?.abort(), f = l = void 0, t.style.overflow = d;
			});
		},
		out(e) {
			if (!a) {
				e?.(), l = void 0;
				return;
			}
			t.inert = !0, p = gi(t, m(), f, 0, () => {
				di(t, "outrostart");
			}, () => {
				di(t, "outroend"), e?.();
			});
		},
		stop: () => {
			f?.abort(), p?.abort();
		}
	}, g = H;
	if ((g.nodes.t ??= []).push(h), i && Ur) {
		var _ = s;
		if (!_) {
			for (var v = g.parent; v && v.f & 65536;) for (; (v = v.parent) && !(v.f & 16););
			_ = !v || !!(v.f & 32768);
		}
		_ && Dn(() => {
			gr(() => h.in());
		});
	}
}
function gi(e, t, n, r, i, a) {
	var o = r === 1;
	if (d(t)) {
		var s, c = !1;
		return $e(() => {
			c || (s = gi(e, t({ direction: o ? "in" : "out" }), n, r, i, a));
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
	let { delay: l = 0, css: u, tick: p, easing: m = mi } = t;
	var h = [];
	if (o && n === void 0 && (p && p(0, 1), u)) {
		var g = pi(u(0, 1));
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
				var g = o + s * m(h / f), y = pi(u(g, 1 - g));
				l.push(y), d ||= y.overflow === "hidden";
			}
			d && (e.style.overflow = "hidden"), _ = () => {
				var e = v.currentTime;
				return o + s * m(e / c);
			}, p && ui(() => {
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
function _i(e, t, n) {
	Dn(() => {
		var r = gr(() => t(e, n?.()) || {});
		if (n && r?.update) {
			var i = !1, a = {};
			kn(() => {
				var e = n();
				_r(e), i && Ve(a, e) && (a = e, r.update(e));
			}), i = !0;
		}
		if (r?.destroy) return () => r.destroy();
	});
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attachments.js
function vi(e, t) {
	var n = void 0, r;
	jn(() => {
		n !== (n = t()) && (r &&= (B(r), null), n && (r = Mn(() => {
			Dn(() => n(e));
		})));
	});
}
//#endregion
//#region ../../node_modules/.bun/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function yi(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = yi(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function bi() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = yi(e)) && (r && (r += " "), r += t);
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/shared/attributes.js
function xi(e) {
	return typeof e == "object" ? bi(e) : e ?? "";
}
var Si = [..." 	\n\r\f\xA0\v﻿"];
function Ci(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || Si.includes(r[o - 1])) && (s === r.length || Si.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
function wi(e, t = !1) {
	var n = t ? " !important;" : ";", r = "";
	for (var i of Object.keys(e)) {
		var a = e[i];
		a != null && a !== "" && (r += " " + i + ": " + a + n);
	}
	return r;
}
function Ti(e) {
	return e[0] !== "-" || e[1] !== "-" ? e.toLowerCase() : e;
}
function Ei(e, t) {
	if (t) {
		var n = "", r, i;
		if (Array.isArray(t) ? (r = t[0], i = t[1]) : r = t, e) {
			e = String(e).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
			var a = !1, o = 0, s = !1, c = [];
			r && c.push(...Object.keys(r).map(Ti)), i && c.push(...Object.keys(i).map(Ti));
			var l = 0, u = -1;
			let t = e.length;
			for (var d = 0; d < t; d++) {
				var f = e[d];
				if (s ? f === "/" && e[d - 1] === "*" && (s = !1) : a ? a === f && (a = !1) : f === "/" && e[d + 1] === "*" ? s = !0 : f === "\"" || f === "'" ? a = f : f === "(" ? o++ : f === ")" && o--, !s && a === !1 && o === 0) {
					if (f === ":" && u === -1) u = d;
					else if (f === ";" || d === t - 1) {
						if (u !== -1) {
							var p = Ti(e.substring(l, u).trim());
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
		return r && (n += wi(r)), i && (n += wi(i, !0)), n = n.trim(), n === "" ? null : n;
	}
	return e == null ? null : String(e);
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/class.js
function X(e, t, n, r, i, a) {
	var o = e[ue];
	if (E || o !== n || o === void 0) {
		var s = Ci(n, r, a);
		(!E || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[ue] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/style.js
function Di(e, t = {}, n, r) {
	for (var i in n) {
		var a = n[i];
		t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
	}
}
function Z(e, t, n, r) {
	var i = e[de];
	if (E || i !== t) {
		var a = Ei(t, r);
		(!E || a !== e.getAttribute("style")) && (a == null ? e.removeAttribute("style") : e.style.cssText = a), e[de] = t;
	} else r && (Array.isArray(r) ? (Di(e, n?.[0], r[0]), Di(e, n?.[1], r[1], "important")) : Di(e, n, r));
	return r;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function Oi(t, n, r = !1) {
	if (t.multiple) {
		if (n == null) return;
		if (!e(n)) return Me();
		for (var i of t.options) i.selected = n.includes(Ai(i));
		return;
	}
	for (i of t.options) if (on(Ai(i), n)) {
		i.selected = !0;
		return;
	}
	(!r || n !== void 0) && (t.selectedIndex = -1);
}
function ki(e) {
	var t = new MutationObserver(() => {
		"__value" in e && Oi(e, e.__value);
	});
	t.observe(e, {
		childList: !0,
		subtree: !0,
		attributes: !0,
		attributeFilter: ["value"]
	}), Cn(() => {
		t.disconnect();
	});
}
function Ai(e) {
	return "__value" in e ? e.__value : e.value;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var ji = Symbol("class"), Mi = Symbol("style"), Ni = Symbol("is custom element"), Pi = Symbol("is html"), Fi = he ? "link" : "LINK", Ii = he ? "input" : "INPUT", Li = he ? "option" : "OPTION", Ri = he ? "select" : "SELECT";
function zi(e) {
	if (E) {
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
		e[pe] = n, $e(n), dt();
	}
}
function Bi(e, t) {
	t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function Q(e, t, n, r) {
	var i = Ui(e);
	E && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Fi) || i[t] !== (i[t] = n) && (t === "loading" && (e[ce] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && Gi(e).includes(t) ? e[t] = n : e.setAttribute(t, n));
}
function Vi(e, t, n, r, i = !1, a = !1) {
	if (E && i && e.nodeName === Ii) {
		var o = e;
		(o.type === "checkbox" ? "defaultChecked" : "defaultValue") in n || zi(o);
	}
	var s = Ui(e), c = s[Ni], l = !s[Pi];
	let u = E && c;
	u && Pe(!1);
	var d = t || {}, f = e.nodeName === Li;
	for (var p in t) p in n || (n[p] = null);
	n.class ? n.class = xi(n.class) : (r || n[ji]) && (n.class = null), n[Mi] && (n.style ??= null);
	var m = Gi(e);
	if (e.nodeName === Ii && "type" in n && ("value" in n || "__value" in n)) {
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
			X(e, e.namespaceURI === "http://www.w3.org/1999/xhtml", o, r, t?.[ji], n[ji]), d[i] = o, d[ji] = n[ji];
			continue;
		}
		if (i === "style") {
			Z(e, o, t?.[Mi], n[Mi]), d[i] = o, d[Mi] = n[Mi];
			continue;
		}
		var g = d[i];
		if (!(o === g && !(o === void 0 && e.hasAttribute(i)))) {
			d[i] = o;
			var _ = i[0] + i[1];
			if (_ !== "$$") {
				if (_ === "on") {
					let t = {}, n = "$$" + i, r = i.slice(2);
					var v = xr(r);
					if (yr(r) && (r = r.slice(0, -7), t.capture = !0), !v && g) {
						if (o != null) continue;
						e.removeEventListener(r, d[n], t), d[n] = null;
					}
					if (v) W(r, e, o), Nr([r]);
					else if (o != null) {
						function a(e) {
							d[i].call(this, e);
						}
						d[n] = jr(r, e, a, t);
					}
				} else if (i === "style") Q(e, i, o);
				else if (i === "autofocus") lt(e, !!o);
				else if (!c && (i === "__value" || i === "value" && o != null)) e.value = e.__value = o;
				else if (i === "selected" && f) Bi(e, o);
				else {
					var y = i;
					l || (y = wr(y));
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
					} else b || m.includes(y) && (c || typeof o != "string") ? (e[y] = o, y in s && (s[y] = T)) : typeof o != "function" && Q(e, y, o, a);
				}
			}
		}
	}
	return u && Pe(!0), d;
}
function Hi(e, t, n = [], r = [], i = [], a, o = !1, s = !1) {
	vt(i, n, r, (n) => {
		var r = void 0, i = {}, c = e.nodeName === Ri, l = !1;
		if (jn(() => {
			var u = t(...n.map(U)), d = Vi(e, r, u, a, o, s);
			l && c && "value" in u && Oi(e, u.value);
			for (let e of Object.getOwnPropertySymbols(i)) u[e] || B(i[e]);
			for (let t of Object.getOwnPropertySymbols(u)) {
				var f = u[t];
				t.description === "@attach" && (!r || f !== r[t]) && (i[t] && B(i[t]), i[t] = Mn(() => vi(e, () => f))), d[t] = f;
			}
			r = d;
		}), c) {
			var u = e;
			Dn(() => {
				Oi(u, r.value, !0), ki(u);
			});
		}
		l = !0;
	});
}
function Ui(e) {
	return e[le] ??= {
		[Ni]: e.nodeName.includes("-"),
		[Pi]: e.namespaceURI === ke
	};
}
var Wi = /* @__PURE__ */ new Map();
function Gi(e) {
	var t = e.getAttribute("is") || e.nodeName, n = Wi.get(t);
	if (n) return n;
	Wi.set(t, n = []);
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.push(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
function Ki(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet();
	pt(e, "input", async (i) => {
		var a = i ? e.defaultValue : e.value;
		if (a = qi(e) ? Ji(a) : a, n(a), M !== null && r.add(M), await pr(), a !== (a = t())) {
			var o = e.selectionStart, s = e.selectionEnd, c = e.value.length;
			if (e.value = a ?? "", s !== null) {
				var l = e.value.length;
				o === s && s === c && l > c ? (e.selectionStart = l, e.selectionEnd = l) : (e.selectionStart = o, e.selectionEnd = Math.min(s, l));
			}
		}
	}), (E && e.defaultValue !== e.value || gr(t) == null && e.value) && (n(qi(e) ? Ji(e.value) : e.value), M !== null && r.add(M)), kn(() => {
		var n = t();
		if (e === document.activeElement) {
			var i = M;
			if (r.has(i)) return;
		}
		qi(e) && n === Ji(e.value) || e.type === "date" && !n && !e.value || n !== e.value && (e.value = n ?? "");
	});
}
function qi(e) {
	var t = e.type;
	return t === "number" || t === "range";
}
function Ji(e) {
	return e === "" ? null : +e;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function Yi(e, t) {
	return e === t || e?.[oe] === t;
}
function Xi(e = {}, t, n, r) {
	var i = k.r, a = H;
	return Dn(() => {
		var o, s;
		return kn(() => {
			o = s, s = r?.() || [], gr(() => {
				Yi(n(...s), e) || (t(e, ...s), o && Yi(n(...o), e) && t(null, ...o));
			});
		}), () => {
			let r = a;
			for (; r !== i && r.parent !== null && r.parent.f & 33554432;) r = r.parent;
			let o = () => {
				s && Yi(n(...s), e) && t(null, ...s);
			}, c = r.teardown;
			r.teardown = () => {
				o(), c?.();
			};
		};
	}), e;
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/client/reactivity/props.js
var Zi = {
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
function Qi(e, t, n) {
	return new Proxy({
		props: e,
		exclude: t
	}, Zi);
}
function $i(e, t, n, r) {
	var i = !0, o = !!(n & 8), s = !!(n & 16), c = r, l = !0, u = void 0, d = () => s && i ? (u ??= /* @__PURE__ */ St(r), U(u)) : (l && (l = !1, c = s ? gr(r) : r), c);
	let f;
	if (o) {
		var p = oe in e || se in e;
		f = a(e, t)?.set ?? (p && t in e ? (n) => e[t] = n : void 0);
	}
	var m, h = !1;
	o ? [m, h] = ct(() => e[t]) : m = e[t], m === void 0 && r !== void 0 && (m = d(), f && (i && Ce(t), f(m)));
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
	var v = !1, y = (n & 1 ? St : Tt)(() => (v = !1, g()));
	o && U(y);
	var b = H;
	return (function(e, t) {
		if (arguments.length > 0) {
			let n = t ? U(y) : i && o ? F(e) : e;
			return P(y, n), v = !0, c !== void 0 && (c = n), e;
		}
		return Gn && v || b.f & 16384 ? y.v : U(y);
	});
}
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region neoshell/src/lib.ts
function $(e) {
	return typeof e != "object" || !e ? {} : e;
}
function ea(e, t) {
	let n = e.get(t);
	if (n === void 0) throw Error(`views: service "${t}" is not available`);
	return n;
}
//#endregion
//#region neoshell/src/Topbar.svelte
var ta = /* @__PURE__ */ G("<button> </button>"), na = /* @__PURE__ */ G("<div class=\"grid h-full grid-cols-[1fr_auto_1fr] items-center bg-base-200/40 px-3 text-[13px]\n    font-medium text-base-content select-none\"><div class=\"flex min-w-0 items-center gap-1\"></div> <div></div> <div class=\"flex justify-end\"></div></div>");
function ra(e, t) {
	Ke(t, !0);
	let n = $i(t, "centerGap", 3, 0), r = /* @__PURE__ */ N(F([])), i = /* @__PURE__ */ N(-1), a = /* @__PURE__ */ N(F(/* @__PURE__ */ new Set())), o = /* @__PURE__ */ new Map();
	wn(() => {
		let e = [
			t.bus.subscribe("hypr.workspaces", (e) => {
				P(r, s(e.data), !0);
			}),
			t.bus.subscribe("hypr.activeworkspace", (e) => {
				P(i, d(e.data), !0), p(U(i));
			}),
			t.bus.subscribe("hypr.windows", (e) => {
				o = m(e.data);
			}),
			t.bus.subscribe("hypr.event", (e) => {
				f(e.data);
			})
		];
		return () => {
			for (let t of e) t();
		};
	});
	function s(e) {
		if (!Array.isArray(e)) return [];
		let t = [];
		for (let n of e) {
			let e = c($(n));
			e !== null && t.push(e);
		}
		return t.sort((e, t) => e.id - t.id);
	}
	function c(e) {
		return typeof e.id != "number" || e.id <= 0 ? null : {
			id: e.id,
			name: l(e),
			occupied: u(e) > 0
		};
	}
	function l(e) {
		return typeof e.name == "string" && e.name !== "" ? e.name : String(e.id);
	}
	function u(e) {
		return typeof e.windows == "number" ? e.windows : 0;
	}
	function d(e) {
		let t = $(e).id;
		return typeof t == "number" ? t : -1;
	}
	function f(e) {
		let t = $(e);
		if (t.event !== "urgent" || typeof t.data != "string") return;
		let n = o.get(g(t.data));
		n !== void 0 && n !== U(i) && P(a, new Set(U(a)).add(n), !0);
	}
	function p(e) {
		if (!U(a).has(e)) return;
		let t = new Set(U(a));
		t.delete(e), P(a, t, !0);
	}
	function m(e) {
		let t = /* @__PURE__ */ new Map();
		if (!Array.isArray(e)) return t;
		for (let n of e) h(t, $(n));
		return t;
	}
	function h(e, t) {
		let n = $(t.workspace).id;
		typeof t.address == "string" && typeof n == "number" && e.set(g(t.address), n);
	}
	function g(e) {
		return e.startsWith("0x") ? e.slice(2) : e;
	}
	function _(e) {
		t.bus.call("hypr:dispatch", {
			dispatcher: "workspace",
			arg: String(e)
		});
	}
	let v = "h-6 min-w-6 cursor-pointer rounded-lg px-2 text-center text-[11px] leading-6 transition-colors duration-150 ";
	function y(e) {
		return U(a).has(e.id) ? v + "bg-warning/20 font-semibold text-warning" : e.id === U(i) ? v + "bg-base-content/15 font-semibold text-base-content" : e.occupied ? v + "text-base-content/70 hover:bg-base-content/10" : v + "text-base-content/25 hover:bg-base-content/10";
	}
	function b(e, t) {
		e.appendChild(t);
	}
	var x = na(), S = I(x);
	ei(S, 21, () => U(r), (e) => e.id, (e, t) => {
		var n = ta(), r = I(n, !0);
		O(n), z((e) => {
			X(n, 1, e), Q(n, "aria-current", U(t).id === U(i)), J(r, U(t).name);
		}, [() => xi(y(U(t)))]), W("click", n, () => _(U(t).id)), q(e, n);
	}), O(S);
	var C = R(S, 2);
	let w;
	_i(R(C, 2), (e, t) => b?.(e, t), () => t.childrenHost), O(x), z(() => w = Z(C, "", w, { width: `${n() ?? ""}px` })), q(e, x), qe();
}
Nr(["click"]);
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/transition/index.js
var ia = (e) => e;
function aa(e) {
	let t = e - 1;
	return t * t * t + 1;
}
function oa(e) {
	let t = typeof e == "string" && e.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
	return t ? [parseFloat(t[1]), t[2] || "px"] : [e, "px"];
}
function sa(e, { delay: t = 0, duration: n = 400, easing: r = ia } = {}) {
	let i = +getComputedStyle(e).opacity;
	return {
		delay: t,
		duration: n,
		easing: r,
		css: (e) => `opacity: ${e * i}`
	};
}
function ca(e, { delay: t = 0, duration: n = 400, easing: r = aa, x: i = 0, y: a = 0, opacity: o = 0 } = {}) {
	let s = getComputedStyle(e), c = +s.opacity, l = s.transform === "none" ? "" : s.transform, u = c * (1 - o), [d, f] = oa(i), [p, m] = oa(a);
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
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/context.js
var la = Symbol("phosphor-svelte");
function ua() {
	return Ge(la) ? We(la) : {};
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/ShuffleIcon.svelte
var da = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), fa = /* @__PURE__ */ K("<path d=\"M240.49,175.51a12,12,0,0,1,0,17l-24,24a12,12,0,0,1-17-17L203,196h-2.09a76.17,76.17,0,0,1-61.85-31.83L97.38,105.78A52.1,52.1,0,0,0,55.06,84H32a12,12,0,0,1,0-24H55.06a76.17,76.17,0,0,1,61.85,31.83l41.71,58.39A52.1,52.1,0,0,0,200.94,172H203l-3.52-3.51a12,12,0,0,1,17-17Zm-95.62-72.62a12,12,0,0,0,16.93-1.13A52,52,0,0,1,200.94,84H203l-3.52,3.51a12,12,0,0,0,17,17l24-24a12,12,0,0,0,0-17l-24-24a12,12,0,0,0-17,17L203,60h-2.09a76,76,0,0,0-57.2,26A12,12,0,0,0,144.87,102.89Zm-33.74,50.22a12,12,0,0,0-16.93,1.13A52,52,0,0,1,55.06,172H32a12,12,0,0,0,0,24H55.06a76,76,0,0,0,57.2-26A12,12,0,0,0,111.13,153.11Z\"></path>"), pa = /* @__PURE__ */ K("<path d=\"M107.14,98.8,128,128l-20.86,29.2A64,64,0,0,1,55.06,184H32V72H55.06A64,64,0,0,1,107.14,98.8ZM200.94,72a64,64,0,0,0-52.08,26.8L128,128l20.86,29.2A64,64,0,0,0,200.94,184H232V72Z\" opacity=\"0.2\"></path><path d=\"M237.66,178.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L212.69,192H200.94a72.12,72.12,0,0,1-58.59-30.15l-41.72-58.4A56.1,56.1,0,0,0,55.06,80H32a8,8,0,0,1,0-16H55.06a72.12,72.12,0,0,1,58.59,30.15l41.72,58.4A56.1,56.1,0,0,0,200.94,176h11.75l-10.35-10.34a8,8,0,0,1,11.32-11.32ZM143,107a8,8,0,0,0,11.16-1.86l1.2-1.67A56.1,56.1,0,0,1,200.94,80h11.75L202.34,90.34a8,8,0,0,0,11.32,11.32l24-24a8,8,0,0,0,0-11.32l-24-24a8,8,0,0,0-11.32,11.32L212.69,64H200.94a72.12,72.12,0,0,0-58.59,30.15l-1.2,1.67A8,8,0,0,0,143,107Zm-30,42a8,8,0,0,0-11.16,1.86l-1.2,1.67A56.1,56.1,0,0,1,55.06,176H32a8,8,0,0,0,0,16H55.06a72.12,72.12,0,0,0,58.59-30.15l1.2-1.67A8,8,0,0,0,113,149Z\"></path>", 1), ma = /* @__PURE__ */ K("<path d=\"M237.66,178.34a8,8,0,0,1,0,11.32l-24,24A8,8,0,0,1,200,208V192a72.15,72.15,0,0,1-57.65-30.14l-41.72-58.4A56.1,56.1,0,0,0,55.06,80H32a8,8,0,0,1,0-16H55.06a72.12,72.12,0,0,1,58.59,30.15l41.72,58.4A56.08,56.08,0,0,0,200,176V160a8,8,0,0,1,13.66-5.66ZM143,107a8,8,0,0,0,11.16-1.86l1.2-1.67A56.08,56.08,0,0,1,200,80V96a8,8,0,0,0,13.66,5.66l24-24a8,8,0,0,0,0-11.32l-24-24A8,8,0,0,0,200,48V64a72.15,72.15,0,0,0-57.65,30.14l-1.2,1.67A8,8,0,0,0,143,107Zm-30,42a8,8,0,0,0-11.16,1.86l-1.2,1.67A56.1,56.1,0,0,1,55.06,176H32a8,8,0,0,0,0,16H55.06a72.12,72.12,0,0,0,58.59-30.15l1.2-1.67A8,8,0,0,0,113,149Z\"></path>"), ha = /* @__PURE__ */ K("<path d=\"M236.24,179.76a6,6,0,0,1,0,8.48l-24,24a6,6,0,0,1-8.48-8.48L217.52,190H200.94a70.16,70.16,0,0,1-57-29.31l-41.71-58.4A58.11,58.11,0,0,0,55.06,78H32a6,6,0,0,1,0-12H55.06a70.16,70.16,0,0,1,57,29.31l41.71,58.4A58.11,58.11,0,0,0,200.94,178h16.58l-13.76-13.76a6,6,0,0,1,8.48-8.48Zm-92.06-74.41a5.91,5.91,0,0,0,3.48,1.12,6,6,0,0,0,4.89-2.51l1.19-1.67A58.11,58.11,0,0,1,200.94,78h16.58L203.76,91.76a6,6,0,1,0,8.48,8.48l24-24a6,6,0,0,0,0-8.48l-24-24a6,6,0,0,0-8.48,8.48L217.52,66H200.94a70.16,70.16,0,0,0-57,29.31L142.78,97A6,6,0,0,0,144.18,105.35Zm-32.36,45.3a6,6,0,0,0-8.37,1.39l-1.19,1.67A58.11,58.11,0,0,1,55.06,178H32a6,6,0,0,0,0,12H55.06a70.16,70.16,0,0,0,57-29.31l1.19-1.67A6,6,0,0,0,111.82,150.65Z\"></path>"), ga = /* @__PURE__ */ K("<path d=\"M237.66,178.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L212.69,192H200.94a72.12,72.12,0,0,1-58.59-30.15l-41.72-58.4A56.1,56.1,0,0,0,55.06,80H32a8,8,0,0,1,0-16H55.06a72.12,72.12,0,0,1,58.59,30.15l41.72,58.4A56.1,56.1,0,0,0,200.94,176h11.75l-10.35-10.34a8,8,0,0,1,11.32-11.32ZM143,107a8,8,0,0,0,11.16-1.86l1.2-1.67A56.1,56.1,0,0,1,200.94,80h11.75L202.34,90.34a8,8,0,0,0,11.32,11.32l24-24a8,8,0,0,0,0-11.32l-24-24a8,8,0,0,0-11.32,11.32L212.69,64H200.94a72.12,72.12,0,0,0-58.59,30.15l-1.2,1.67A8,8,0,0,0,143,107Zm-30,42a8,8,0,0,0-11.16,1.86l-1.2,1.67A56.1,56.1,0,0,1,55.06,176H32a8,8,0,0,0,0,16H55.06a72.12,72.12,0,0,0,58.59-30.15l1.2-1.67A8,8,0,0,0,113,149Z\"></path>"), _a = /* @__PURE__ */ K("<path d=\"M234.83,181.17a4,4,0,0,1,0,5.66l-24,24a4,4,0,0,1-5.66-5.66L222.34,188h-21.4a68.15,68.15,0,0,1-55.34-28.48l-41.71-58.39A60.11,60.11,0,0,0,55.06,76H32a4,4,0,0,1,0-8H55.06A68.15,68.15,0,0,1,110.4,96.48l41.71,58.39A60.11,60.11,0,0,0,200.94,180h21.4l-17.17-17.17a4,4,0,0,1,5.66-5.66Zm-89.49-77.44a4,4,0,0,0,5.58-.93l1.19-1.67A60.11,60.11,0,0,1,200.94,76h21.4L205.17,93.17a4,4,0,0,0,5.66,5.66l24-24a4,4,0,0,0,0-5.66l-24-24a4,4,0,0,0-5.66,5.66L222.34,68h-21.4A68.15,68.15,0,0,0,145.6,96.48l-1.19,1.67A4,4,0,0,0,145.34,103.73Zm-34.68,48.54a4,4,0,0,0-5.58.93l-1.19,1.67A60.11,60.11,0,0,1,55.06,180H32a4,4,0,0,0,0,8H55.06a68.15,68.15,0,0,0,55.34-28.48l1.19-1.67A4,4,0,0,0,110.66,152.27Z\"></path>"), va = /* @__PURE__ */ K("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function ya(e, t) {
	Ke(t, !0);
	let n = ua(), r = /* @__PURE__ */ Qi(t, da), i = /* @__PURE__ */ j(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ j(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ j(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ j(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = va();
	Hi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: U(o),
		height: U(o),
		fill: U(a),
		transform: U(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = I(l), d = (e) => {
		var n = Hr();
		oi(L(n), () => t.children), q(e, n);
	};
	Y(u, (e) => {
		t.children && e(d);
	});
	var f = R(u, 2), p = (e) => {
		q(e, fa());
	}, m = (e) => {
		var t = pa();
		Le(), q(e, t);
	}, h = (e) => {
		q(e, ma());
	}, g = (e) => {
		q(e, ha());
	}, _ = (e) => {
		q(e, ga());
	}, v = (e) => {
		q(e, _a());
	}, y = (e) => {
		var t = Vr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), q(e, t);
	};
	Y(f, (e) => {
		U(i) === "bold" ? e(p) : U(i) === "duotone" ? e(m, 1) : U(i) === "fill" ? e(h, 2) : U(i) === "light" ? e(g, 3) : U(i) === "regular" ? e(_, 4) : U(i) === "thin" ? e(v, 5) : e(y, -1);
	}), O(l), q(e, l), qe();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/RewindIcon.svelte
var ba = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), xa = /* @__PURE__ */ K("<path d=\"M225.7,54.46a20,20,0,0,0-20.33.66L132,101.85v-30a19.91,19.91,0,0,0-30.63-16.72L13.19,111.29a19.79,19.79,0,0,0,0,33.42l88.18,56.17A19.91,19.91,0,0,0,132,184.16v-30l73.37,46.73A19.91,19.91,0,0,0,236,184.16V71.84A19.84,19.84,0,0,0,225.7,54.46ZM108,176.64,31.63,128,108,79.36Zm104,0L135.63,128,212,79.36Z\"></path>"), Sa = /* @__PURE__ */ K("<path d=\"M224,71.85v112.3a7.91,7.91,0,0,1-12.18,6.59l-88.19-56.15a7.8,7.8,0,0,1,0-13.18l88.19-56.15A7.91,7.91,0,0,1,224,71.85ZM107.82,65.26,19.63,121.41a7.8,7.8,0,0,0,0,13.18l88.19,56.15A7.91,7.91,0,0,0,120,184.15V71.85A7.91,7.91,0,0,0,107.82,65.26Z\" opacity=\"0.2\"></path><path d=\"M223.77,58a16,16,0,0,0-16.25.53L128,109.14V71.84A15.91,15.91,0,0,0,103.52,58.5L15.33,114.66a15.8,15.8,0,0,0,0,26.68l88.19,56.16A15.91,15.91,0,0,0,128,184.16v-37.3l79.52,50.64A15.91,15.91,0,0,0,232,184.16V71.84A15.83,15.83,0,0,0,223.77,58ZM112,183.93,24.18,128,112,72.06Zm104,0L128.18,128,216,72.06Z\"></path>", 1), Ca = /* @__PURE__ */ K("<path d=\"M232,71.84V184.16a15.92,15.92,0,0,1-24.48,13.34L128,146.86v37.3a15.92,15.92,0,0,1-24.48,13.34L15.33,141.34a15.8,15.8,0,0,1,0-26.68L103.52,58.5A15.91,15.91,0,0,1,128,71.84v37.3L207.52,58.5A15.91,15.91,0,0,1,232,71.84Z\"></path>"), wa = /* @__PURE__ */ K("<path d=\"M222.81,59.72a14,14,0,0,0-14.22.46L126,112.79V71.84a13.83,13.83,0,0,0-7.19-12.12,14,14,0,0,0-14.22.46L16.41,116.35a13.79,13.79,0,0,0,0,23.3l88.18,56.17a14,14,0,0,0,14.22.46A13.83,13.83,0,0,0,126,184.16V143.21l82.59,52.61a14,14,0,0,0,14.22.46A13.83,13.83,0,0,0,230,184.16V71.84A13.83,13.83,0,0,0,222.81,59.72ZM114,184.16a1.73,1.73,0,0,1-1,1.59,1.9,1.9,0,0,1-2-.06L22.85,129.53a1.8,1.8,0,0,1,0-3.06L111,70.31a1.87,1.87,0,0,1,1-.32,2,2,0,0,1,1,.26,1.73,1.73,0,0,1,1,1.59Zm104,0a1.73,1.73,0,0,1-1,1.59,1.9,1.9,0,0,1-2-.06l-88.19-56.16a1.8,1.8,0,0,1,0-3.06L215,70.31a1.87,1.87,0,0,1,1-.32,2,2,0,0,1,1,.26,1.73,1.73,0,0,1,1,1.59Z\"></path>"), Ta = /* @__PURE__ */ K("<path d=\"M223.77,58a16,16,0,0,0-16.25.53L128,109.14V71.84A15.91,15.91,0,0,0,103.52,58.5L15.33,114.66a15.8,15.8,0,0,0,0,26.68l88.19,56.16A15.91,15.91,0,0,0,128,184.16v-37.3l79.52,50.64A15.91,15.91,0,0,0,232,184.16V71.84A15.83,15.83,0,0,0,223.77,58ZM112,183.93,24.18,128,112,72.06Zm104,0L128.18,128,216,72.06Z\"></path>"), Ea = /* @__PURE__ */ K("<path d=\"M221.85,61.48a12,12,0,0,0-12.18.39L124,116.43V71.84a11.66,11.66,0,0,0-6.15-10.36,12,12,0,0,0-12.18.39L17.48,118a11.81,11.81,0,0,0,0,19.94l88.19,56.16a12,12,0,0,0,12.18.39A11.66,11.66,0,0,0,124,184.16V139.57l85.67,54.56a12,12,0,0,0,12.18.39A11.66,11.66,0,0,0,228,184.16V71.84A11.66,11.66,0,0,0,221.85,61.48ZM116,184.16a3.76,3.76,0,0,1-2,3.35,3.91,3.91,0,0,1-4-.13L21.78,131.22a3.8,3.8,0,0,1,0-6.44L110,68.62a3.94,3.94,0,0,1,2.13-.63,4,4,0,0,1,1.91.5,3.76,3.76,0,0,1,2,3.35Zm104,0a3.76,3.76,0,0,1-2,3.35,3.91,3.91,0,0,1-4-.13l-88.18-56.16a3.8,3.8,0,0,1,0-6.44L214,68.62a3.94,3.94,0,0,1,2.13-.63,4,4,0,0,1,1.91.5,3.76,3.76,0,0,1,2,3.35Z\"></path>"), Da = /* @__PURE__ */ K("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function Oa(e, t) {
	Ke(t, !0);
	let n = ua(), r = /* @__PURE__ */ Qi(t, ba), i = /* @__PURE__ */ j(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ j(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ j(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ j(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Da();
	Hi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: U(o),
		height: U(o),
		fill: U(a),
		transform: U(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = I(l), d = (e) => {
		var n = Hr();
		oi(L(n), () => t.children), q(e, n);
	};
	Y(u, (e) => {
		t.children && e(d);
	});
	var f = R(u, 2), p = (e) => {
		q(e, xa());
	}, m = (e) => {
		var t = Sa();
		Le(), q(e, t);
	}, h = (e) => {
		q(e, Ca());
	}, g = (e) => {
		q(e, wa());
	}, _ = (e) => {
		q(e, Ta());
	}, v = (e) => {
		q(e, Ea());
	}, y = (e) => {
		var t = Vr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), q(e, t);
	};
	Y(f, (e) => {
		U(i) === "bold" ? e(p) : U(i) === "duotone" ? e(m, 1) : U(i) === "fill" ? e(h, 2) : U(i) === "light" ? e(g, 3) : U(i) === "regular" ? e(_, 4) : U(i) === "thin" ? e(v, 5) : e(y, -1);
	}), O(l), q(e, l), qe();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/FastForwardIcon.svelte
var ka = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), Aa = /* @__PURE__ */ K("<path d=\"M246.81,111.29,158.63,55.12A19.91,19.91,0,0,0,128,71.84v30L54.63,55.12A19.91,19.91,0,0,0,24,71.84V184.16a19.93,19.93,0,0,0,30.63,16.72L128,154.15v30a19.93,19.93,0,0,0,30.63,16.72l88.18-56.17a19.79,19.79,0,0,0,0-33.42ZM48,176.64V79.36L124.38,128Zm104,0V79.36L228.38,128Z\"></path>"), ja = /* @__PURE__ */ K("<path d=\"M144,128a7.76,7.76,0,0,1-3.63,6.59L52.18,190.74A7.91,7.91,0,0,1,40,184.15V71.85a7.91,7.91,0,0,1,12.18-6.59l88.19,56.15A7.76,7.76,0,0,1,144,128Zm100.37-6.59L156.18,65.26A7.91,7.91,0,0,0,144,71.85v112.3a7.91,7.91,0,0,0,12.18,6.59l88.19-56.15A7.8,7.8,0,0,0,244.37,121.41Z\" opacity=\"0.2\"></path><path d=\"M248.67,114.66,160.48,58.5A15.91,15.91,0,0,0,136,71.84v37.3L56.48,58.5A15.91,15.91,0,0,0,32,71.84V184.16A15.92,15.92,0,0,0,56.48,197.5L136,146.86v37.3a15.92,15.92,0,0,0,24.48,13.34l88.19-56.16a15.8,15.8,0,0,0,0-26.68ZM48,183.94V72.07L135.82,128Zm104,0V72.07L239.82,128Z\"></path>", 1), Ma = /* @__PURE__ */ K("<path d=\"M256,128a15.76,15.76,0,0,1-7.33,13.34L160.48,197.5A15.91,15.91,0,0,1,136,184.16v-37.3L56.48,197.5A15.91,15.91,0,0,1,32,184.16V71.84A15.91,15.91,0,0,1,56.48,58.5L136,109.14V71.84A15.91,15.91,0,0,1,160.48,58.5l88.19,56.16A15.76,15.76,0,0,1,256,128Z\"></path>"), Na = /* @__PURE__ */ K("<path d=\"M247.59,116.35,159.41,60.18a14,14,0,0,0-14.22-.46A13.83,13.83,0,0,0,138,71.84v41L55.41,60.18a14,14,0,0,0-14.22-.46A13.83,13.83,0,0,0,34,71.84V184.16a13.83,13.83,0,0,0,7.19,12.12,14,14,0,0,0,14.22-.46L138,143.21v40.95a13.83,13.83,0,0,0,7.19,12.12,14,14,0,0,0,14.22-.46l88.18-56.17a13.79,13.79,0,0,0,0-23.3ZM137.15,129.53,49,185.69a1.9,1.9,0,0,1-2,.06,1.73,1.73,0,0,1-1-1.59V71.84a1.73,1.73,0,0,1,1-1.59,2,2,0,0,1,1-.26,1.87,1.87,0,0,1,1,.32l88.19,56.16a1.8,1.8,0,0,1,0,3.06Zm104,0L153,185.69a1.9,1.9,0,0,1-2,.06,1.73,1.73,0,0,1-1-1.59V71.84a1.73,1.73,0,0,1,1-1.59,2,2,0,0,1,1-.26,1.87,1.87,0,0,1,1,.32l88.19,56.16a1.8,1.8,0,0,1,0,3.06Z\"></path>"), Pa = /* @__PURE__ */ K("<path d=\"M248.67,114.66,160.48,58.5A15.91,15.91,0,0,0,136,71.84v37.3L56.48,58.5A15.91,15.91,0,0,0,32,71.84V184.16A15.92,15.92,0,0,0,56.48,197.5L136,146.86v37.3a15.92,15.92,0,0,0,24.48,13.34l88.19-56.16a15.8,15.8,0,0,0,0-26.68ZM48,183.94V72.07L135.82,128Zm104,0V72.07L239.82,128Z\"></path>"), Fa = /* @__PURE__ */ K("<path d=\"M246.52,118,158.33,61.87a12,12,0,0,0-12.18-.39A11.66,11.66,0,0,0,140,71.84v44.59L54.33,61.87a12,12,0,0,0-12.18-.39A11.66,11.66,0,0,0,36,71.84V184.16a11.66,11.66,0,0,0,6.15,10.36,12,12,0,0,0,12.18-.39L140,139.57v44.59a11.66,11.66,0,0,0,6.15,10.36,12,12,0,0,0,12.18-.39L246.52,138a11.81,11.81,0,0,0,0-19.94Zm-108.3,13.19L50,187.38a3.91,3.91,0,0,1-4,.13,3.76,3.76,0,0,1-2-3.35V71.84a3.76,3.76,0,0,1,2-3.35,4,4,0,0,1,1.91-.5,3.94,3.94,0,0,1,2.13.63l88.18,56.16a3.8,3.8,0,0,1,0,6.44Zm104,0L154,187.38a3.91,3.91,0,0,1-4,.13,3.76,3.76,0,0,1-2-3.35V71.84a3.76,3.76,0,0,1,2-3.35,4,4,0,0,1,1.91-.5,3.94,3.94,0,0,1,2.13.63l88.18,56.16a3.8,3.8,0,0,1,0,6.44Z\"></path>"), Ia = /* @__PURE__ */ K("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function La(e, t) {
	Ke(t, !0);
	let n = ua(), r = /* @__PURE__ */ Qi(t, ka), i = /* @__PURE__ */ j(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ j(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ j(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ j(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Ia();
	Hi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: U(o),
		height: U(o),
		fill: U(a),
		transform: U(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = I(l), d = (e) => {
		var n = Hr();
		oi(L(n), () => t.children), q(e, n);
	};
	Y(u, (e) => {
		t.children && e(d);
	});
	var f = R(u, 2), p = (e) => {
		q(e, Aa());
	}, m = (e) => {
		var t = ja();
		Le(), q(e, t);
	}, h = (e) => {
		q(e, Ma());
	}, g = (e) => {
		q(e, Na());
	}, _ = (e) => {
		q(e, Pa());
	}, v = (e) => {
		q(e, Fa());
	}, y = (e) => {
		var t = Vr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), q(e, t);
	};
	Y(f, (e) => {
		U(i) === "bold" ? e(p) : U(i) === "duotone" ? e(m, 1) : U(i) === "fill" ? e(h, 2) : U(i) === "light" ? e(g, 3) : U(i) === "regular" ? e(_, 4) : U(i) === "thin" ? e(v, 5) : e(y, -1);
	}), O(l), q(e, l), qe();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/PlayIcon.svelte
var Ra = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), za = /* @__PURE__ */ K("<path d=\"M234.49,111.07,90.41,22.94A20,20,0,0,0,60,39.87V216.13a20,20,0,0,0,30.41,16.93l144.08-88.13a19.82,19.82,0,0,0,0-33.86ZM84,208.85V47.15L216.16,128Z\"></path>"), Ba = /* @__PURE__ */ K("<path d=\"M228.23,134.69,84.15,222.81A8,8,0,0,1,72,216.12V39.88a8,8,0,0,1,12.15-6.69l144.08,88.12A7.82,7.82,0,0,1,228.23,134.69Z\" opacity=\"0.2\"></path><path d=\"M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z\"></path>", 1), Va = /* @__PURE__ */ K("<path d=\"M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z\"></path>"), Ha = /* @__PURE__ */ K("<path d=\"M231.36,116.19,87.28,28.06a14,14,0,0,0-14.18-.27A13.69,13.69,0,0,0,66,39.87V216.13a13.69,13.69,0,0,0,7.1,12.08,14,14,0,0,0,14.18-.27l144.08-88.13a13.82,13.82,0,0,0,0-23.62Zm-6.26,13.38L81,217.7a2,2,0,0,1-2.06,0,1.78,1.78,0,0,1-1-1.61V39.87a1.78,1.78,0,0,1,1-1.61A2.06,2.06,0,0,1,80,38a2,2,0,0,1,1,.31L225.1,126.43a1.82,1.82,0,0,1,0,3.14Z\"></path>"), Ua = /* @__PURE__ */ K("<path d=\"M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z\"></path>"), Wa = /* @__PURE__ */ K("<path d=\"M230.32,117.9,86.24,29.79a11.91,11.91,0,0,0-12.17-.23A11.71,11.71,0,0,0,68,39.89V216.11a11.71,11.71,0,0,0,6.07,10.33,11.91,11.91,0,0,0,12.17-.23L230.32,138.1a11.82,11.82,0,0,0,0-20.2Zm-4.18,13.37L82.06,219.39a4,4,0,0,1-4.07.07,3.77,3.77,0,0,1-2-3.35V39.89a3.77,3.77,0,0,1,2-3.35,4,4,0,0,1,4.07.07l144.08,88.12a3.8,3.8,0,0,1,0,6.54Z\"></path>"), Ga = /* @__PURE__ */ K("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function Ka(e, t) {
	Ke(t, !0);
	let n = ua(), r = /* @__PURE__ */ Qi(t, Ra), i = /* @__PURE__ */ j(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ j(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ j(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ j(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = Ga();
	Hi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: U(o),
		height: U(o),
		fill: U(a),
		transform: U(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = I(l), d = (e) => {
		var n = Hr();
		oi(L(n), () => t.children), q(e, n);
	};
	Y(u, (e) => {
		t.children && e(d);
	});
	var f = R(u, 2), p = (e) => {
		q(e, za());
	}, m = (e) => {
		var t = Ba();
		Le(), q(e, t);
	}, h = (e) => {
		q(e, Va());
	}, g = (e) => {
		q(e, Ha());
	}, _ = (e) => {
		q(e, Ua());
	}, v = (e) => {
		q(e, Wa());
	}, y = (e) => {
		var t = Vr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), q(e, t);
	};
	Y(f, (e) => {
		U(i) === "bold" ? e(p) : U(i) === "duotone" ? e(m, 1) : U(i) === "fill" ? e(h, 2) : U(i) === "light" ? e(g, 3) : U(i) === "regular" ? e(_, 4) : U(i) === "thin" ? e(v, 5) : e(y, -1);
	}), O(l), q(e, l), qe();
}
//#endregion
//#region ../../node_modules/.bun/phosphor-svelte@3.1.0+05174c81df0b1cc0/node_modules/phosphor-svelte/lib/PauseIcon.svelte
var qa = /* @__PURE__ */ new Set([
	"$$slots",
	"$$events",
	"$$legacy",
	"children"
]), Ja = /* @__PURE__ */ K("<path d=\"M200,28H160a20,20,0,0,0-20,20V208a20,20,0,0,0,20,20h40a20,20,0,0,0,20-20V48A20,20,0,0,0,200,28Zm-4,176H164V52h32ZM96,28H56A20,20,0,0,0,36,48V208a20,20,0,0,0,20,20H96a20,20,0,0,0,20-20V48A20,20,0,0,0,96,28ZM92,204H60V52H92Z\"></path>"), Ya = /* @__PURE__ */ K("<path d=\"M208,48V208a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h40A8,8,0,0,1,208,48ZM96,40H56a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H96a8,8,0,0,0,8-8V48A8,8,0,0,0,96,40Z\" opacity=\"0.2\"></path><path d=\"M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z\"></path>", 1), Xa = /* @__PURE__ */ K("<path d=\"M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z\"></path>"), Za = /* @__PURE__ */ K("<path d=\"M200,34H160a14,14,0,0,0-14,14V208a14,14,0,0,0,14,14h40a14,14,0,0,0,14-14V48A14,14,0,0,0,200,34Zm2,174a2,2,0,0,1-2,2H160a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2h40a2,2,0,0,1,2,2ZM96,34H56A14,14,0,0,0,42,48V208a14,14,0,0,0,14,14H96a14,14,0,0,0,14-14V48A14,14,0,0,0,96,34Zm2,174a2,2,0,0,1-2,2H56a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2H96a2,2,0,0,1,2,2Z\"></path>"), Qa = /* @__PURE__ */ K("<path d=\"M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z\"></path>"), $a = /* @__PURE__ */ K("<path d=\"M200,36H160a12,12,0,0,0-12,12V208a12,12,0,0,0,12,12h40a12,12,0,0,0,12-12V48A12,12,0,0,0,200,36Zm4,172a4,4,0,0,1-4,4H160a4,4,0,0,1-4-4V48a4,4,0,0,1,4-4h40a4,4,0,0,1,4,4ZM96,36H56A12,12,0,0,0,44,48V208a12,12,0,0,0,12,12H96a12,12,0,0,0,12-12V48A12,12,0,0,0,96,36Zm4,172a4,4,0,0,1-4,4H56a4,4,0,0,1-4-4V48a4,4,0,0,1,4-4H96a4,4,0,0,1,4,4Z\"></path>"), eo = /* @__PURE__ */ K("<svg><!><rect width=\"256\" height=\"256\" fill=\"none\"></rect><!></svg>");
function to(e, t) {
	Ke(t, !0);
	let n = ua(), r = /* @__PURE__ */ Qi(t, qa), i = /* @__PURE__ */ j(() => t.weight ?? n.weight ?? "regular"), a = /* @__PURE__ */ j(() => t.color ?? n.color ?? "currentColor"), o = /* @__PURE__ */ j(() => t.size ?? n.size ?? "1em"), s = /* @__PURE__ */ j(() => t.mirrored ?? n.mirrored ?? !1);
	function c(e) {
		let { weight: t, color: n, size: r, mirrored: i, ...a } = e;
		return a;
	}
	var l = eo();
	Hi(l, (e, t) => ({
		xmlns: "http://www.w3.org/2000/svg",
		role: "img",
		width: U(o),
		height: U(o),
		fill: U(a),
		transform: U(s) ? "scale(-1, 1)" : void 0,
		viewBox: "0 0 256 256",
		...e,
		...t
	}), [() => c(n), () => c(r)]);
	var u = I(l), d = (e) => {
		var n = Hr();
		oi(L(n), () => t.children), q(e, n);
	};
	Y(u, (e) => {
		t.children && e(d);
	});
	var f = R(u, 2), p = (e) => {
		q(e, Ja());
	}, m = (e) => {
		var t = Ya();
		Le(), q(e, t);
	}, h = (e) => {
		q(e, Xa());
	}, g = (e) => {
		q(e, Za());
	}, _ = (e) => {
		q(e, Qa());
	}, v = (e) => {
		q(e, $a());
	}, y = (e) => {
		var t = Vr();
		t.nodeValue = (console.error("Unsupported icon weight. Choose from \"thin\", \"light\", \"regular\", \"bold\", \"fill\", or \"duotone\"."), ""), q(e, t);
	};
	Y(f, (e) => {
		U(i) === "bold" ? e(p) : U(i) === "duotone" ? e(m, 1) : U(i) === "fill" ? e(h, 2) : U(i) === "light" ? e(g, 3) : U(i) === "regular" ? e(_, 4) : U(i) === "thin" ? e(v, 5) : e(y, -1);
	}), O(l), q(e, l), qe();
}
//#endregion
//#region neoshell/src/Notch.svelte
var no = /* @__PURE__ */ G("<span class=\"truncate text-[13px] text-base-content/60\"> </span>"), ro = /* @__PURE__ */ G("<span></span> <span class=\"flex min-w-0 flex-1 flex-col gap-1\"><span> </span> <!></span> <!>", 1), io = /* @__PURE__ */ G("<span class=\"level-bar w-[2px] rounded-full bg-current svelte-ek0z1c\"></span>"), ao = /* @__PURE__ */ G("<span aria-hidden=\"true\"></span>"), oo = /* @__PURE__ */ G("<div class=\"flex items-center gap-2.5\"><span class=\"w-8 shrink-0 tabular-nums text-[11px] text-base-content/50\"> </span> <div class=\"h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-base-content/15 outline-none\" role=\"slider\" tabindex=\"0\" aria-label=\"Seek\"><div class=\"h-full rounded-full bg-base-content/70 transition-[width] duration-500 ease-linear\"></div></div> <span class=\"w-9 shrink-0 text-right tabular-nums text-[11px] text-base-content/50\"> </span></div>"), so = /* @__PURE__ */ G("<div class=\"grid grid-cols-[1fr_auto_1fr] items-center px-1\"><div class=\"flex justify-start\"><button type=\"button\" aria-label=\"Shuffle\"><!></button></div> <div class=\"flex items-center gap-6\"><button type=\"button\" aria-label=\"Previous track\"><!></button> <button type=\"button\"><!></button> <button type=\"button\" aria-label=\"Next track\"><!></button></div> <div></div></div>"), co = /* @__PURE__ */ G("<div class=\"pointer-events-none absolute inset-0 bg-cover bg-center opacity-25\"></div> <div class=\"pointer-events-none absolute inset-0 bg-gradient-to-r from-base-100\n          via-base-100/60 to-base-100/20\"></div>", 1), lo = /* @__PURE__ */ G("<span class=\"shrink-0 tabular-nums text-base-content/50\"> </span>"), uo = /* @__PURE__ */ G("<span></span> <span class=\"min-w-0 flex-1 truncate\"> </span> <!>", 1), fo = /* @__PURE__ */ G("<div class=\"absolute inset-x-4 bottom-1.5 h-[3px] overflow-hidden rounded-full\n            bg-base-content/15\"><div></div></div>"), po = /* @__PURE__ */ G("<div class=\"relative flex min-h-0 flex-1 flex-col justify-end gap-3 px-4 pb-4\"><!> <!></div>"), mo = /* @__PURE__ */ G("<span class=\"truncate text-[13px] text-base-content/70\"> </span>"), ho = /* @__PURE__ */ G("<div class=\"relative flex min-h-0 flex-1 flex-col justify-end gap-1 px-4 pb-4\"><!> <span class=\"text-[10px] tracking-wide text-base-content/30 uppercase\"> </span></div>"), go = /* @__PURE__ */ G("<button type=\"button\"><!></button> <!> <!>", 1), _o = /* @__PURE__ */ G("<div class=\"notch relative svelte-ek0z1c\"><div class=\"relative flex flex-col overflow-hidden rounded-b-[0.625rem] bg-base-100\n      text-[12px] leading-none text-base-content\n      transition-[width,height] duration-[260ms] ease-[cubic-bezier(0.32,1.24,0.5,1)]\" role=\"status\" aria-live=\"polite\"><!> <!></div></div>");
function vo(e, t) {
	Ke(t, !0);
	let n = (e, t = f) => {
		let n = /* @__PURE__ */ j(() => U(C) === "expandedMedia");
		var i = ro(), a = L(i), o = R(a, 2), s = I(o), c = I(s, !0);
		O(s);
		var l = R(s, 2), u = (e) => {
			var n = no(), r = I(n, !0);
			O(n), z(() => J(r, t().detail)), q(e, n);
		};
		Y(l, (e) => {
			U(n) && t().detail !== "" && e(u);
		}), O(o);
		var d = R(o, 2);
		r(d, () => U(n)), z((e, n, r) => {
			X(a, 1, e, "svelte-ek0z1c"), Z(a, n), X(s, 1, r, "svelte-ek0z1c"), J(c, t().label);
		}, [
			() => xi(Me(U(n))),
			() => Ne(t().art),
			() => xi(E(U(n)))
		]), q(e, i);
	}, r = (e, t = f) => {
		var n = ao();
		ei(n, 20, () => [
			0,
			1,
			2,
			3
		], (e) => e, (e, t) => {
			var n = io();
			let r;
			z(() => r = Z(n, "", r, { "animation-delay": `${t * 130}ms` })), q(e, n);
		}), O(n), z((e) => X(n, 1, e, "svelte-ek0z1c"), [() => xi(D(t()))]), q(e, n);
	}, i = (e) => {
		var t = oo(), n = I(t), r = I(n, !0);
		O(n);
		var i = R(n, 2);
		Q(i, "aria-valuemin", 0);
		var a = I(i);
		let o;
		O(i);
		var s = R(i, 2), c = I(s, !0);
		O(s), O(t), z((e, t, n, s, l) => {
			J(r, e), Q(i, "aria-valuemax", t), Q(i, "aria-valuenow", n), o = Z(a, "", o, s), J(c, l);
		}, [
			() => Se(),
			() => Math.round(U(h).length),
			() => Math.round(U(g)),
			() => ({ width: xe() }),
			() => Ce()
		]), W("click", i, Te), W("keydown", i, Ee), q(e, t);
	}, a = (e) => {
		var t = so(), n = I(t), r = I(n);
		ya(I(r), {
			size: 20,
			weight: "bold"
		}), O(r), O(n);
		var i = R(n, 2), a = I(i);
		Oa(I(a), {
			size: 22,
			weight: "fill"
		}), O(a);
		var o = R(a, 2), s = I(o), c = (e) => {
			to(e, {
				size: 26,
				weight: "fill"
			});
		}, l = (e) => {
			Ka(e, {
				size: 26,
				weight: "fill"
			});
		};
		Y(s, (e) => {
			U(h).status === "Playing" ? e(c) : e(l, -1);
		}), O(o);
		var u = R(o, 2);
		La(I(u), {
			size: 22,
			weight: "fill"
		}), O(u), O(i), Le(2), O(t), z((e, t, n, i, s) => {
			X(r, 1, e, "svelte-ek0z1c"), Q(r, "aria-pressed", U(h).shuffle), X(a, 1, t, "svelte-ek0z1c"), X(o, 1, n, "svelte-ek0z1c"), Q(o, "aria-label", i), X(u, 1, s, "svelte-ek0z1c");
		}, [
			() => xi(T(U(h).shuffle)),
			() => xi(T(!1)),
			() => xi(T(!1)),
			() => Fe(),
			() => xi(T(!1))
		]), W("click", r, () => De("media:shuffle")), W("click", a, () => De("media:previous")), W("click", o, () => De("media:playPause")), W("click", u, () => De("media:next")), q(e, t);
	}, o = "media", s = {
		empty: {
			width: 128,
			height: 30
		},
		rest: {
			width: 272,
			height: 30
		},
		active: {
			width: 320,
			height: 30
		},
		expanded: {
			width: 380,
			height: 116
		},
		expandedMedia: {
			width: 380,
			height: 164
		}
	}, c = {
		width: 12,
		height: 3
	}, l = {
		ArrowLeft: -5,
		ArrowRight: 5,
		ArrowDown: -5,
		ArrowUp: 5
	}, u = {
		neutral: "text-base-content",
		accent: "text-accent",
		success: "text-success",
		warning: "text-warning",
		error: "text-error"
	}, d = /* @__PURE__ */ N(F([])), p = /* @__PURE__ */ N(!1), m = /* @__PURE__ */ N(!1), h = /* @__PURE__ */ N(F({
		status: "",
		length: 0,
		shuffle: !1
	})), g = /* @__PURE__ */ N(0), _ = /* @__PURE__ */ new Map(), v = "", y = "", b = "", x = /* @__PURE__ */ j(() => ee(U(d))), S = /* @__PURE__ */ j(() => U(x) !== null && U(x).id === o), C = /* @__PURE__ */ j(() => te(U(x), U(m), U(S))), w = /* @__PURE__ */ j(() => ne(s[U(C)], U(C), U(p)));
	wn(() => {
		let e = [
			t.bus.subscribe("island:show", (e) => {
				ce(e.data);
			}),
			t.bus.subscribe("island:dismiss", (e) => {
				ae(ge($(e.data).id));
			}),
			t.bus.subscribe("hypr.activewindow", (e) => {
				le(e.data);
			}),
			t.bus.subscribe("system.volume", (e) => {
				ue(e.data);
			}),
			t.bus.subscribe("media.player", (e) => {
				de(e.data);
			}),
			t.bus.subscribe("media.position", (e) => {
				P(g, _e($(e.data).position, 0), !0);
			})
		];
		return () => {
			for (let t of e) t();
			oe();
		};
	}), wn(() => {
		let e = he(U(x));
		e !== b && (P(m, !1), b = e);
	});
	function ee(e) {
		let t = null;
		for (let n of e) (t === null || n.priority >= t.priority) && (t = n);
		return t;
	}
	function te(e, t, n) {
		return e === null ? "empty" : t && n ? "expandedMedia" : t ? "expanded" : e.priority > 0 ? "active" : "rest";
	}
	function ne(e, t, n) {
		return !n || t.startsWith("expanded") ? e : {
			width: e.width + c.width,
			height: e.height + c.height
		};
	}
	function re() {
		U(x) !== null && P(m, !U(m));
	}
	function ie(e, t) {
		ae(e.id), P(d, [...U(d), e], !0), !(t <= 0) && _.set(e.id, setTimeout(() => ae(e.id), t));
	}
	function ae(e) {
		let t = _.get(e);
		t !== void 0 && (clearTimeout(t), _.delete(e)), P(d, U(d).filter((t) => t.id !== e), !0);
	}
	function oe() {
		for (let e of _.values()) clearTimeout(e);
		_.clear();
	}
	function se(e) {
		return {
			priority: 10,
			label: "",
			detail: "",
			progress: -1,
			tone: "neutral",
			art: "",
			...e
		};
	}
	function ce(e) {
		let t = $(e), n = ge(t.id);
		if (n === "") {
			console.error("notch: island:show without an id, ignored");
			return;
		}
		ie(se({
			id: n,
			priority: _e(t.priority, 30),
			label: ge(t.label),
			detail: ge(t.detail),
			progress: _e(t.progress, -1),
			tone: ve(t.tone)
		}), _e(t.ttlMs, 0));
	}
	function le(e) {
		let t = $(e), n = ge(t.title);
		if (n === "") {
			ae("window");
			return;
		}
		ie(se({
			id: "window",
			priority: 0,
			label: n,
			detail: me(t)
		}), 0);
	}
	function ue(e) {
		let t = $(e), n = t.volume;
		if (typeof n != "number") return;
		let r = `${n}:${t.muted === !0}`;
		if (r === v) return;
		let i = v === "";
		v = r, !i && ie(pe(n, t.muted === !0), 1600);
	}
	function de(e) {
		let t = $(e), n = ge(t.title), r = ge(t.status);
		if (n === "" || r === "" || r === "Stopped") {
			ae(o);
			return;
		}
		n !== y && (P(g, 0), y = n), P(h, {
			status: r,
			length: _e(t.length, 0),
			shuffle: t.shuffle === !0
		}, !0), ie(se({
			id: o,
			priority: 10,
			label: n,
			detail: ge(t.artist),
			art: fe(ge(t.artUrl))
		}), 0);
	}
	function fe(e) {
		if (e.startsWith("file://")) {
			let t = decodeURIComponent(e.slice(7));
			return `/file?path=${encodeURIComponent(t)}`;
		}
		return e.startsWith("http://") || e.startsWith("https://") ? e : "";
	}
	function pe(e, t) {
		return se(t ? {
			id: "volume",
			priority: 20,
			label: "Muted",
			tone: "accent"
		} : {
			id: "volume",
			priority: 20,
			label: "Volume",
			detail: `${e}%`,
			progress: e / 100,
			tone: "accent"
		});
	}
	function me(e) {
		let t = ge(e.initialClass);
		return t === "" ? ge(e.class) : t;
	}
	function he(e) {
		return e === null ? "" : e.id;
	}
	function ge(e) {
		return typeof e == "string" ? e : "";
	}
	function _e(e, t) {
		return typeof e == "number" ? e : t;
	}
	function ve(e) {
		return typeof e == "string" && u[e] !== void 0 ? e : "neutral";
	}
	function ye(e) {
		return e === null ? u.neutral : u[e.tone];
	}
	function be(e) {
		return `${Math.min(Math.max(e.progress, 0), 1) * 100}%`;
	}
	function xe() {
		return U(h).length <= 0 ? "0%" : `${Math.min(Math.max(U(g) / U(h).length, 0), 1) * 100}%`;
	}
	function Se() {
		return we(U(g));
	}
	function Ce() {
		return U(h).length <= 0 ? "" : `-${we(U(h).length - U(g))}`;
	}
	function we(e) {
		let t = Math.max(Math.floor(e), 0);
		return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
	}
	function Te(e) {
		if (U(h).length <= 0) return;
		let n = e.currentTarget.getBoundingClientRect(), r = Math.min(Math.max((e.clientX - n.left) / n.width, 0), 1);
		t.bus.call("media:seek", { seconds: r * U(h).length });
	}
	function Ee(e) {
		let n = l[e.key];
		if (n === void 0 || U(h).length <= 0) return;
		e.preventDefault();
		let r = Math.min(Math.max(U(g) + n, 0), U(h).length);
		t.bus.call("media:seek", { seconds: r });
	}
	function De(e) {
		t.bus.call(e, {});
	}
	let Oe = "flex cursor-pointer items-center justify-center rounded-lg p-1 outline-none transition-colors duration-150 hover:bg-base-content/10";
	function T(e) {
		return e ? `${Oe} text-accent` : `${Oe} text-base-content/85`;
	}
	let ke = "relative flex w-full shrink-0 cursor-pointer items-center text-left outline-none";
	function Ae(e) {
		return e === "expandedMedia" ? `${ke} h-16 gap-3 px-4 pt-1` : `${ke} h-7.5 gap-2.5 px-3`;
	}
	let je = "shrink-0 overflow-hidden bg-base-content/10 bg-cover bg-center";
	function Me(e) {
		return e ? `${je} size-12 rounded-lg` : `${je} size-5 rounded-md`;
	}
	function Ne(e) {
		return e === "" ? "" : `background-image: url('${e}')`;
	}
	function E(e) {
		return e ? "truncate text-[15px] font-semibold" : "truncate font-medium";
	}
	let Pe = "flex shrink-0 items-center gap-[2px] text-accent";
	function D(e) {
		let t = `${Pe} h-3`;
		return e && (t = `${Pe} h-4`), U(h).status === "Playing" ? t : `${t} paused`;
	}
	function Fe() {
		return U(h).status === "Playing" ? "Pause" : "Play";
	}
	var Ie = _o(), Re = I(Ie);
	let ze;
	var Be = I(Re), Ve = (e) => {
		var t = co(), n = L(t);
		let r;
		Le(2), z(() => r = Z(n, "", r, { "background-image": `url('${U(x).art ?? ""}')` })), q(e, t);
	};
	Y(Be, (e) => {
		U(x) !== null && U(x).art !== "" && !U(S) && e(Ve);
	});
	var He = R(Be, 2), k = (e) => {
		var t = go(), r = L(t), o = I(r), s = (e) => {
			n(e, () => U(x));
		}, c = (e) => {
			var t = uo(), n = L(t), r = R(n, 2), i = I(r, !0);
			O(r);
			var a = R(r, 2), o = (e) => {
				var t = lo(), n = I(t, !0);
				O(t), z(() => J(n, U(x).detail)), q(e, t);
			}, s = /* @__PURE__ */ j(() => U(x).detail !== "" && !U(C).startsWith("expanded"));
			Y(a, (e) => {
				U(s) && e(o);
			}), z((e) => {
				X(n, 1, `h-1.5 w-1.5 shrink-0 rounded-full bg-current ${e ?? ""}`, "svelte-ek0z1c"), J(i, U(x).label);
			}, [() => ye(U(x))]), q(e, t);
		};
		Y(o, (e) => {
			U(S) ? e(s) : e(c, -1);
		}), O(r);
		var l = R(r, 2), u = (e) => {
			var t = fo(), n = I(t);
			let r;
			O(t), z((e, t) => {
				X(n, 1, `h-full rounded-full bg-current ${e ?? ""} transition-[width] duration-200`, "svelte-ek0z1c"), r = Z(n, "", r, t);
			}, [() => ye(U(x)), () => ({ width: be(U(x)) })]), q(e, t);
		}, d = /* @__PURE__ */ j(() => U(x).progress >= 0 && !U(C).startsWith("expanded"));
		Y(l, (e) => {
			U(d) && e(u);
		});
		var f = R(l, 2), p = (e) => {
			var t = po(), n = I(t);
			i(n);
			var r = R(n, 2);
			a(r), O(t), hi(3, t, () => sa, () => ({ duration: 120 })), q(e, t);
		}, m = (e) => {
			var t = ho(), n = I(t), r = (e) => {
				var t = mo(), n = I(t, !0);
				O(t), z(() => J(n, U(x).detail)), q(e, t);
			};
			Y(n, (e) => {
				U(x).detail !== "" && e(r);
			});
			var i = R(n, 2), a = I(i, !0);
			O(i), O(t), z(() => J(a, U(x).id)), hi(3, t, () => sa, () => ({ duration: 120 })), q(e, t);
		};
		Y(f, (e) => {
			U(C) === "expandedMedia" ? e(p) : U(C) === "expanded" && e(m, 1);
		}), z((e, t) => {
			X(r, 1, e, "svelte-ek0z1c"), Q(r, "aria-expanded", t), Q(r, "aria-label", U(x).label);
		}, [() => xi(Ae(U(C))), () => U(C).startsWith("expanded")]), W("click", r, re), q(e, t);
	};
	Y(He, (e) => {
		U(x) !== null && e(k);
	}), O(Re), O(Ie), z(() => ze = Z(Re, "", ze, {
		width: `${U(w).width ?? ""}px`,
		height: `${U(w).height ?? ""}px`
	})), Mr("pointerenter", Re, () => P(p, !0)), Mr("pointerleave", Re, () => P(p, !1)), q(e, Ie), qe();
}
Nr(["click", "keydown"]);
//#endregion
//#region neoshell/src/Clock.svelte
var yo = /* @__PURE__ */ G("<button type=\"button\" class=\"flex items-center gap-2 rounded-lg px-2 py-0.5 tabular-nums transition-colors\n    hover:bg-base-content/10\" aria-label=\"Quick settings\"><span class=\"text-base-content/60\"> </span> <span> </span></button>");
function bo(e, t) {
	Ke(t, !0);
	let n = new Intl.DateTimeFormat(void 0, {
		weekday: "short",
		day: "numeric",
		month: "short"
	}), r = new Intl.DateTimeFormat(void 0, {
		hour: "2-digit",
		minute: "2-digit"
	}), i = /* @__PURE__ */ N(F(/* @__PURE__ */ new Date()));
	wn(() => {
		let e = setInterval(() => {
			P(i, /* @__PURE__ */ new Date(), !0);
		}, 1e3);
		return () => {
			clearInterval(e);
		};
	});
	function a() {
		t.bus.publish("quicksettings:toggle", {});
	}
	var o = yo(), s = I(o), c = I(s, !0);
	O(s);
	var l = R(s, 2), u = I(l, !0);
	O(l), O(o), z((e, t) => {
		J(c, e), J(u, t);
	}, [() => n.format(U(i)), () => r.format(U(i))]), W("click", o, a), q(e, o), qe();
}
Nr(["click"]);
//#endregion
//#region neoshell/src/Battery.svelte
var xo = /* @__PURE__ */ K("<path d=\"M12.5 2.2 9 7h2.6l-1.6 4.6L13.5 6h-2.6z\" fill=\"var(--color-base-100)\" stroke=\"currentColor\" stroke-width=\"0.75\"></path>"), So = /* @__PURE__ */ G("<div class=\"flex items-center gap-1.5 text-base-content/80 tabular-nums\"><span> </span> <svg width=\"25\" height=\"13\" viewBox=\"0 0 25 13\" fill=\"none\" class=\"shrink-0\"><rect x=\"0.5\" y=\"0.5\" width=\"21\" height=\"12\" rx=\"3\" stroke=\"currentColor\" stroke-opacity=\"0.5\"></rect><rect x=\"2\" y=\"2\" height=\"9\" rx=\"1.5\"></rect><path d=\"M23.5 4.5v4a2 2 0 0 0 0-4z\" fill=\"currentColor\" fill-opacity=\"0.5\"></path><!></svg></div>");
function Co(e, t) {
	Ke(t, !0);
	let n = /* @__PURE__ */ N(-1), r = /* @__PURE__ */ N(!1);
	wn(() => t.bus.subscribe("system.battery", (e) => {
		let t = $(e.data);
		typeof t.percent == "number" && P(n, Math.round(t.percent), !0), P(r, t.charging === !0);
	}));
	let i = /* @__PURE__ */ j(() => Math.max(2, Math.round(U(n) / 100 * 18))), a = /* @__PURE__ */ j(() => o(U(n), U(r)));
	function o(e, t) {
		return e >= 0 && e <= 15 && !t ? "fill-error" : "fill-current";
	}
	var s = Hr(), c = L(s), l = (e) => {
		var t = So(), o = I(t), s = I(o);
		O(o);
		var c = R(o, 2), l = R(I(c)), u = R(l, 2), d = (e) => {
			q(e, xo());
		};
		Y(u, (e) => {
			U(r) && e(d);
		}), O(c), O(t), z(() => {
			J(s, `${U(n) ?? ""}%`), Q(l, "width", U(i)), X(l, 0, xi(U(a)));
		}), q(e, t);
	};
	Y(c, (e) => {
		U(n) >= 0 && e(l);
	}), q(e, s), qe();
}
//#endregion
//#region neoshell/src/Dock.svelte
var wo = /* @__PURE__ */ G("<span class=\"flex h-11 w-11 items-center justify-center rounded-xl bg-base-content/10\n                    text-lg font-semibold svelte-1fmj2hb\"> </span>"), To = /* @__PURE__ */ G("<img class=\"h-11 w-11 object-contain drop-shadow-md svelte-1fmj2hb\"/>"), Eo = /* @__PURE__ */ G("<span class=\"absolute bottom-0 h-1 w-1 rounded-full bg-base-content/80 svelte-1fmj2hb\"></span>"), Do = /* @__PURE__ */ G("<button class=\"app group relative flex w-13 cursor-pointer flex-col items-center pb-1.5 svelte-1fmj2hb\"><span class=\"pointer-events-none absolute bottom-full mb-6 origin-bottom scale-90 rounded-md\n              border border-base-content/10 bg-base-300/90 px-2 py-0.5 text-xs whitespace-nowrap\n              opacity-0 transition duration-150 group-hover:scale-100 group-hover:opacity-100 svelte-1fmj2hb\"> </span> <span class=\"zoom svelte-1fmj2hb\"><span><!></span></span> <!></button>"), Oo = /* @__PURE__ */ G("<div class=\"relative h-full svelte-1fmj2hb\"><div class=\"absolute inset-x-0 bottom-0 h-1 svelte-1fmj2hb\" data-input-region=\"\" aria-hidden=\"true\"></div> <div role=\"toolbar\" tabindex=\"-1\" aria-label=\"Dock\" aria-orientation=\"horizontal\"><div class=\"pb-2 svelte-1fmj2hb\" data-input-region=\"\"><div class=\"flex items-end gap-1 rounded-2xl border border-base-content/10 bg-base-200/40 px-2 py-1.5 svelte-1fmj2hb\"></div></div></div></div>");
function ko(e, t) {
	Ke(t, !0);
	let n = /* @__PURE__ */ N(F([])), r = /* @__PURE__ */ N(F([])), i = /* @__PURE__ */ N(F([])), a = /* @__PURE__ */ N(F([])), o = /* @__PURE__ */ N(!1), s = /* @__PURE__ */ N(F(/* @__PURE__ */ new Set())), c = /* @__PURE__ */ N(F(/* @__PURE__ */ new Set())), l, u = /* @__PURE__ */ j(() => g(U(n), U(i), U(a))), d = /* @__PURE__ */ j(() => h(U(n), U(u), U(r))), f = /* @__PURE__ */ j(() => new Set(U(r).map((e) => e.toLowerCase())));
	wn(() => {
		let e = t.bus.subscribe("hypr.windows", (e) => {
			P(r, b(e.data), !0), ne();
		}), n = t.bus.subscribe("config", (e) => {
			P(i, x(e.data), !0), P(a, S(e.data), !0);
		});
		return p(), () => {
			e(), n();
		};
	}), wn(() => {
		let e = new ResizeObserver(() => {
			P(o, l.clientHeight > 16);
		});
		return e.observe(l), () => e.disconnect();
	});
	async function p() {
		let e = await t.bus.call("apps:list", {});
		Array.isArray(e) && P(n, e.map(m), !0);
	}
	function m(e) {
		let t = $(e), n = {
			id: "",
			name: "",
			exec: "",
			icon: "",
			wmClass: ""
		};
		return typeof t.id == "string" && (n.id = t.id), typeof t.name == "string" && (n.name = t.name), n.name === "" && typeof t.label == "string" && (n.name = t.label), typeof t.exec == "string" && (n.exec = t.exec), typeof t.icon == "string" && (n.icon = t.icon), typeof t.wmClass == "string" && (n.wmClass = t.wmClass), n;
	}
	function h(e, t, n) {
		let r = [...t], i = new Set(r.map((e) => e.id.toLowerCase()));
		for (let t of n) {
			let n = v(e, t);
			i.has(n.id.toLowerCase()) || (i.add(n.id.toLowerCase()), r.push(n));
		}
		return r;
	}
	function g(e, t, n) {
		if (t.length === 0) return n;
		let r = [];
		for (let n of t) {
			let t = _(e, n);
			t !== null && r.push(t);
		}
		return r;
	}
	function _(e, t) {
		let n = t.toLowerCase();
		for (let t of e) if (t.id.toLowerCase() === n || t.name.toLowerCase() === n) return t;
		return null;
	}
	function v(e, t) {
		let n = t.toLowerCase();
		for (let t of e) if (y(t, n)) return t;
		return {
			id: t,
			name: t,
			exec: "",
			icon: t,
			wmClass: t
		};
	}
	function y(e, t) {
		return e.wmClass === "" ? e.id.toLowerCase() === t || e.name.toLowerCase() === t : e.wmClass.toLowerCase() === t;
	}
	function b(e) {
		let t = /* @__PURE__ */ new Set();
		if (!Array.isArray(e)) return [];
		for (let n of e) {
			let e = $(n).class;
			typeof e == "string" && e !== "" && t.add(e);
		}
		return [...t].sort((e, t) => e.localeCompare(t));
	}
	function x(e) {
		let t = $($(e).dock);
		return Array.isArray(t.pinned) ? t.pinned.filter((e) => typeof e == "string") : [];
	}
	function S(e) {
		let t = $($(e).dock);
		return Array.isArray(t.apps) ? t.apps.map(m).filter((e) => e.id !== "") : [];
	}
	function C(e) {
		return e.wmClass === "" ? U(f).has(e.id.toLowerCase()) : U(f).has(e.wmClass.toLowerCase());
	}
	async function w(e) {
		if (C(e)) {
			t.bus.call("hypr:dispatch", {
				dispatcher: "focuswindow",
				arg: `class:${re(e)}`
			});
			return;
		}
		ee(e.id);
		let n = $(await t.bus.call("apps:launch", { command: e.exec }));
		n.error !== void 0 && (console.error(`dock: launching ${e.name} failed:`, n.error), te(e.id));
	}
	function ee(e) {
		P(c, new Set(U(c)).add(e), !0), setTimeout(() => te(e), 15e3);
	}
	function te(e) {
		if (!U(c).has(e)) return;
		let t = new Set(U(c));
		t.delete(e), P(c, t, !0);
	}
	function ne() {
		for (let e of U(d)) U(c).has(e.id) && C(e) && te(e.id);
	}
	function re(e) {
		return e.wmClass === "" ? e.id : e.wmClass;
	}
	function ie(e) {
		return `/appicon/${encodeURIComponent(e.icon)}?size=96`;
	}
	function ae(e) {
		P(s, new Set(U(s)).add(e.id), !0);
	}
	function oe(e) {
		return e.name.slice(0, 1).toUpperCase();
	}
	var se = Oo(), ce = R(I(se), 2);
	let le;
	var ue = I(ce), de = I(ue);
	ei(de, 21, () => U(d), (e) => e.id, (e, t) => {
		var n = Do(), r = I(n), i = I(r, !0);
		O(r);
		var a = R(r, 2), o = I(a);
		let l;
		var u = I(o), d = (e) => {
			var n = wo(), r = I(n, !0);
			O(n), z((e) => J(r, e), [() => oe(U(t))]), q(e, n);
		}, f = /* @__PURE__ */ j(() => U(s).has(U(t).id)), p = (e) => {
			var n = To();
			z((e) => {
				Q(n, "src", e), Q(n, "alt", U(t).name);
			}, [() => ie(U(t))]), Mr("error", n, () => ae(U(t))), Ar(n), q(e, n);
		};
		Y(u, (e) => {
			U(f) ? e(d) : e(p, -1);
		}), O(o), O(a);
		var m = R(a, 2), h = (e) => {
			q(e, Eo());
		}, g = /* @__PURE__ */ j(() => C(U(t)));
		Y(m, (e) => {
			U(g) && e(h);
		}), O(n), z((e) => {
			J(i, U(t).name), l = X(o, 1, "hop svelte-1fmj2hb", null, l, e);
		}, [() => ({ hopping: U(c).has(U(t).id) })]), W("click", n, () => w(U(t))), q(e, n);
	}), O(de), O(ue), O(ce), O(se), Xi(se, (e) => l = e, () => l), z(() => le = X(ce, 1, "absolute inset-x-0 bottom-0 flex justify-center\n      transition-transform duration-200 ease-out svelte-1fmj2hb", null, le, { "translate-y-full": !U(o) })), q(e, se), qe();
}
Nr(["click"]);
//#endregion
//#region neoshell/src/AlignmentGuides.svelte
var Ao = /* @__PURE__ */ G("<div class=\"pointer-events-none absolute top-0 bottom-0 w-px bg-primary/70\"></div>"), jo = /* @__PURE__ */ G("<div class=\"pointer-events-none absolute right-0 left-0 h-px bg-primary/70\"></div>");
function Mo(e, t) {
	function n(e) {
		return `${e.vertical},${e.position}`;
	}
	var r = Hr();
	ei(L(r), 17, () => t.guides, (e) => n(e), (e, t) => {
		var n = Hr(), r = L(n), i = (e) => {
			var n = Ao();
			let r;
			z(() => r = Z(n, "", r, { left: `${U(t).position}px` })), q(e, n);
		}, a = (e) => {
			var n = jo();
			let r;
			z(() => r = Z(n, "", r, { top: `${U(t).position}px` })), q(e, n);
		};
		Y(r, (e) => {
			U(t).vertical ? e(i) : e(a, -1);
		}), q(e, n);
	}), q(e, r);
}
//#endregion
//#region neoshell/src/ContextMenu.svelte
var No = /* @__PURE__ */ G("<div class=\"my-1 h-px bg-base-content/10\"></div>"), Po = /* @__PURE__ */ G("<span class=\"shrink-0 opacity-60\">›</span>"), Fo = /* @__PURE__ */ G("<button class=\"flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px]\n                    text-base-content disabled:opacity-40 enabled:hover:bg-base-content/10\" role=\"menuitem\"><span class=\"grow truncate\"> </span></button>"), Io = /* @__PURE__ */ G("<div class=\"absolute top-0 left-full z-10 min-w-52 rounded-xl border border-base-content/10\n                bg-base-200/95 p-1 shadow-2xl backdrop-blur-xl\" role=\"menu\"></div>"), Lo = /* @__PURE__ */ G("<div class=\"relative\" role=\"none\"><button role=\"menuitem\"><span class=\"w-3 shrink-0 text-center\"> </span> <span class=\"grow truncate\"> </span> <!></button> <!></div>"), Ro = /* @__PURE__ */ G("<div class=\"fixed inset-0 z-50\" role=\"presentation\"><div class=\"absolute min-w-52 rounded-xl border border-base-content/10 bg-base-200/95 p-1\n      shadow-2xl backdrop-blur-xl\" role=\"menu\" tabindex=\"-1\"></div></div>");
function zo(e, t) {
	Ke(t, !0);
	let n = /* @__PURE__ */ N(void 0), r = /* @__PURE__ */ N(-1), i = /* @__PURE__ */ j(() => a(t.menu, U(n)));
	function a(e, t) {
		return t === void 0 ? {
			left: e.x,
			top: e.y
		} : {
			left: o(e.x, t.offsetWidth, window.innerWidth),
			top: o(e.y, t.offsetHeight, window.innerHeight)
		};
	}
	function o(e, t, n) {
		return e + t <= n ? e : Math.max(0, e - t);
	}
	function s(e) {
		e.disabled !== !0 && e.children === void 0 && (t.onclose(), e.action !== void 0 && e.action());
	}
	function c(e) {
		e.key === "Escape" && t.onclose();
	}
	var l = Ro();
	Mr("keydown", sn, c);
	var u = I(l);
	let d;
	ei(u, 21, () => t.menu.items, Xr, (e, t, n) => {
		var i = Hr(), a = L(i), o = (e) => {
			q(e, No());
		}, c = (e) => {
			var i = Lo(), a = I(i);
			let o;
			var c = I(a), l = I(c, !0);
			O(c);
			var u = R(c, 2), d = I(u, !0);
			O(u);
			var f = R(u, 2), p = (e) => {
				q(e, Po());
			};
			Y(f, (e) => {
				U(t).children !== void 0 && e(p);
			}), O(a);
			var m = R(a, 2), h = (e) => {
				var n = Io();
				Z(n, "", {}, { "margin-left": "-4px" }), ei(n, 21, () => U(t).children, Xr, (e, t) => {
					var n = Fo(), r = I(n), i = I(r, !0);
					O(r), O(n), z(() => {
						n.disabled = U(t).disabled === !0, J(i, U(t).label);
					}), W("click", n, () => s(U(t))), q(e, n);
				}), O(n), q(e, n);
			};
			Y(m, (e) => {
				U(t).children !== void 0 && U(r) === n && e(h);
			}), O(i), z(() => {
				o = X(a, 1, "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px]\n              text-base-content disabled:opacity-40 enabled:hover:bg-base-content/10", null, o, { "text-error": U(t).danger === !0 }), a.disabled = U(t).disabled === !0, J(l, U(t).checked === !0 ? "✓" : ""), J(d, U(t).label);
			}), Mr("pointerenter", i, () => {
				P(r, n, !0);
			}), W("click", a, () => s(U(t))), q(e, i);
		};
		Y(a, (e) => {
			U(t).separator === !0 ? e(o) : e(c, -1);
		}), q(e, i);
	}), O(u), Xi(u, (e) => P(n, e), () => U(n)), O(l), z(() => d = Z(u, "", d, {
		left: `${U(i).left}px`,
		top: `${U(i).top}px`
	})), W("pointerdown", l, function(...e) {
		t.onclose?.apply(this, e);
	}), W("contextmenu", l, (e) => {
		e.preventDefault(), t.onclose();
	}), W("pointerdown", u, (e) => e.stopPropagation()), q(e, l), qe();
}
Nr([
	"pointerdown",
	"contextmenu",
	"click"
]);
var Bo = {
	columns: 1,
	rows: 1
}, Vo = {
	small: {
		columns: 2,
		rows: 2
	},
	medium: {
		columns: 4,
		rows: 2
	},
	large: {
		columns: 4,
		rows: 4
	}
}, Ho = Vo.small, Uo = [
	"small",
	"medium",
	"large"
];
function Wo(e) {
	if (typeof e != "string") return Ho;
	let t = Vo[e];
	return t === void 0 ? Ho : t;
}
function Go(e) {
	let t = e - 16;
	if (t <= 96) return Math.max(1, t);
	let n = Math.ceil((t + 8) / 104);
	return (t - (n - 1) * 8) / n;
}
function Ko(e, t) {
	return {
		width: t.columns * e + (t.columns - 1) * 8,
		height: t.rows * e + (t.rows - 1) * 8
	};
}
function qo(e, t) {
	return {
		x: e.x,
		y: e.y,
		width: t.width,
		height: t.height
	};
}
function Jo(e, t) {
	return e.x + e.width <= t.x || t.x + t.width <= e.x ? !1 : !(e.y + e.height <= t.y || t.y + t.height <= e.y);
}
function Yo(e, t) {
	return t.some((t) => Jo(e, t));
}
function Xo(e, t, n) {
	let r = Math.max(8, n.width - 8 - t.width), i = Math.max(40, n.height - 88 - t.height);
	return {
		x: Math.min(Math.max(8, e.x), r),
		y: Math.min(Math.max(40, e.y), i)
	};
}
function Zo(e, t, n, r) {
	let i = $o(ns(e.x, t.width, n, r)), a = $o(rs(e.y, t.height, n, r));
	return {
		point: {
			x: e.x + i.offset,
			y: e.y + a.offset
		},
		guides: [...ts(i, !0), ...ts(a, !1)]
	};
}
var Qo = {
	offset: 0,
	guide: null
};
function $o(e) {
	let t = Qo, n = 8;
	for (let r of e) {
		let e = Math.abs(r.target - r.edge);
		e < n && (n = e, t = es(r));
	}
	return t;
}
function es(e) {
	let t = e.target - e.edge;
	return e.guide ? {
		offset: t,
		guide: e.target
	} : {
		offset: t,
		guide: null
	};
}
function ts(e, t) {
	return e.guide === null ? [] : [{
		vertical: t,
		position: e.guide
	}];
}
function ns(e, t, n, r) {
	let i = [
		e,
		e + t / 2,
		e + t
	], a = is(i, [
		8,
		r.width / 2,
		r.width - 8
	]);
	for (let r of n) a.push(...is(i, [
		r.x,
		r.x + r.width / 2,
		r.x + r.width
	])), a.push({
		edge: e,
		target: r.x + r.width + 8,
		guide: !1
	}), a.push({
		edge: e + t,
		target: r.x - 8,
		guide: !1
	});
	return a;
}
function rs(e, t, n, r) {
	let i = [
		e,
		e + t / 2,
		e + t
	], a = is(i, [
		40,
		r.height / 2,
		r.height - 88
	]);
	for (let r of n) a.push(...is(i, [
		r.y,
		r.y + r.height / 2,
		r.y + r.height
	])), a.push({
		edge: e,
		target: r.y + r.height + 8,
		guide: !1
	}), a.push({
		edge: e + t,
		target: r.y - 8,
		guide: !1
	});
	return a;
}
function is(e, t) {
	return e.map((e, n) => ({
		edge: e,
		target: t[n],
		guide: !0
	}));
}
function as(e, t, n, r) {
	let i = n.height - 88 - e.height;
	for (let a of os(e, n, r)) {
		let n = ss(a, e, t, i);
		if (n !== null) return n;
	}
	return Xo({
		x: 8,
		y: 40
	}, e, n);
}
function os(e, t, n) {
	let r = t.width - 8 - e.width;
	return n ? ls(r, 8) : cs(8, r);
}
function ss(e, t, n, r) {
	for (let i of cs(40, r)) if (!Yo(qo({
		x: e,
		y: i
	}, t), n)) return {
		x: e,
		y: i
	};
	return null;
}
function cs(e, t) {
	let n = [];
	for (let r = e; r <= t; r += 104) n.push(r);
	return n;
}
function ls(e, t) {
	let n = [];
	for (let r = e; r >= t; r -= 104) n.push(r);
	return n;
}
//#endregion
//#region neoshell/src/DesktopIcons.svelte
var us = /* @__PURE__ */ G("<input class=\"w-full rounded bg-base-100 px-1 text-center text-[11px] leading-tight\n          text-base-content outline-none\"/>"), ds = /* @__PURE__ */ G("<span class=\"line-clamp-2 text-[11px] leading-tight text-base-content drop-shadow-md\"> </span>"), fs = /* @__PURE__ */ G("<button><img class=\"h-12 w-12 shrink-0 object-contain drop-shadow-md\" alt=\"\" draggable=\"false\"/> <!></button>");
function ps(e, t) {
	Ke(t, !0);
	let n = 1e4, r = $i(t, "store", 7), i = /* @__PURE__ */ N(F(/* @__PURE__ */ new Set())), a = /* @__PURE__ */ N(null), o = /* @__PURE__ */ N("");
	wn(() => t.bus.subscribe("files.desktop", (e) => {
		r().applyDesktopFolder(e.data), P(i, /* @__PURE__ */ new Set(), !0);
	}));
	function s(e) {
		return e.image && !U(i).has(e.path) ? `/file?path=${encodeURIComponent(e.path)}` : `/appicon/${encodeURIComponent(e.icon)}?size=64`;
	}
	function c(e) {
		P(i, new Set(U(i)).add(e.path), !0);
	}
	function l(e) {
		let t = r().iconPoint(e.path);
		return t === void 0 ? {
			x: 0,
			y: 0
		} : t;
	}
	function u(e) {
		return U(a) === null || !U(a).moved || !U(a).paths.includes(e) ? "" : `translate(${U(a).dx}px, ${U(a).dy}px)`;
	}
	function d(e) {
		t.bus.call("files:open", { path: e.path }, n);
	}
	function f() {
		for (let e of r().selection) t.bus.call("files:open", { path: e }, n);
	}
	function p(e, t) {
		if (t.button === 0) {
			if (t.stopPropagation(), t.ctrlKey) {
				r().toggleSelected(e.path);
				return;
			}
			r().isSelected(e.path) || r().selectOnly(e.path), !r().desktopLocked && (t.currentTarget.setPointerCapture(t.pointerId), P(a, {
				pointerId: t.pointerId,
				startX: t.clientX,
				startY: t.clientY,
				dx: 0,
				dy: 0,
				moved: !1,
				paths: [...r().selection],
				leadPath: e.path
			}, !0));
		}
	}
	function m(e) {
		if (U(a) === null || U(a).pointerId !== e.pointerId) return;
		let t = {
			x: e.clientX - U(a).startX,
			y: e.clientY - U(a).startY
		}, n = U(a).moved || Math.abs(t.x) > 4 || Math.abs(t.y) > 4;
		if (!n) {
			P(a, {
				...U(a),
				dx: t.x,
				dy: t.y,
				moved: n
			}, !0);
			return;
		}
		let r = h(U(a), t);
		P(a, {
			...U(a),
			dx: r.x,
			dy: r.y,
			moved: n
		}, !0);
	}
	function h(e, t) {
		let n = r().iconPoint(e.leadPath);
		if (n === void 0) return t;
		let i = {
			x: n.x + t.x,
			y: n.y + t.y
		}, a = r().snapDrag(i, r().layout.iconSize, g(e));
		return {
			x: a.x - n.x,
			y: a.y - n.y
		};
	}
	function g(e) {
		return e.paths.flatMap((e) => {
			let t = r().iconPoint(e);
			return t === void 0 ? [] : [qo(t, r().layout.iconSize)];
		});
	}
	function _(e) {
		if (U(a) === null || U(a).pointerId !== e.pointerId) return;
		let t = U(a);
		P(a, null), r().clearGuides(), t.moved && v(t);
	}
	function v(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.paths) y(t, n, e);
		r().moveIcons(e.paths, t);
	}
	function y(e, t, n) {
		let i = r().iconPoint(t);
		i !== void 0 && e.set(t, {
			x: i.x + n.dx,
			y: i.y + n.dy
		});
	}
	async function b(e, t) {
		t.preventDefault(), t.stopPropagation(), r().isSelected(e.path) || r().selectOnly(e.path), r().openMenu(t.clientX, t.clientY, await x(e));
	}
	async function x(e) {
		let t = r().selection.size;
		return [
			{
				label: t > 1 ? `Open ${t} items` : "Open",
				action: f
			},
			{
				label: "Open With",
				children: await S(e)
			},
			{ separator: !0 },
			{
				label: "Rename",
				disabled: t > 1,
				action: () => w(e)
			},
			{
				label: t > 1 ? `Move ${t} items to Trash` : "Move to Trash",
				danger: !0,
				action: te
			}
		];
	}
	async function S(e) {
		let r = C(await t.bus.call("files:handlers", { path: e.path }, n));
		return r.length === 0 ? [{
			label: "No applications found",
			disabled: !0
		}] : r.map((r) => ({
			label: r.name,
			action: () => {
				t.bus.call("files:openwith", {
					path: e.path,
					command: r.command
				}, n);
			}
		}));
	}
	function C(e) {
		if (typeof e != "object" || !e) return [];
		let t = e.handlers;
		return Array.isArray(t) ? t : [];
	}
	function w(e) {
		P(o, e.name, !0), r().renamingPath = e.path;
	}
	function ee(e) {
		let i = U(o).trim();
		r().renamingPath = "", i !== "" && i !== e.name && t.bus.call("files:rename", {
			path: e.path,
			name: i
		}, n);
	}
	function te() {
		t.bus.call("files:trash", { paths: [...r().selection] }, n), r().clearSelection();
	}
	function ne(e) {
		e.focus(), e.select();
	}
	function re(e) {
		return r().isSelected(e) ? "bg-base-content/20 ring-1 ring-base-content/25" : "hover:bg-base-content/10";
	}
	var ie = Hr();
	ei(L(ie), 17, () => r().sortedEntries, (e) => e.path, (e, t) => {
		let n = /* @__PURE__ */ j(() => l(U(t)));
		var i = fs();
		let f, h;
		var g = I(i), v = R(g, 2), y = (e) => {
			var n = us();
			zi(n), Dn(() => Ki(n, () => U(o), (e) => P(o, e))), _i(n, (e) => ne?.(e)), W("pointerdown", n, (e) => e.stopPropagation()), Mr("blur", n, () => ee(U(t))), W("keydown", n, (e) => {
				e.key === "Enter" && ee(U(t)), e.key === "Escape" && (r().renamingPath = "");
			}), q(e, n);
		}, x = (e) => {
			var n = ds(), r = I(n, !0);
			O(n), z(() => J(r, U(t).name)), q(e, n);
		};
		Y(v, (e) => {
			r().renamingPath === U(t).path ? e(y) : e(x, -1);
		}), O(i), z((e, n, r, a) => {
			f = X(i, 1, `absolute flex flex-col items-center gap-1 rounded-lg p-2 text-center select-none
      focus:outline-none ${e ?? ""}`, null, f, n), Q(i, "title", U(t).name), h = Z(i, "", h, r), Q(g, "src", a);
		}, [
			() => re(U(t).path),
			() => ({ "z-10": U(a) !== null && U(a).paths.includes(U(t).path) }),
			() => ({
				left: `${U(n).x}px`,
				top: `${U(n).y}px`,
				width: `${r().layout.iconSize.width}px`,
				height: `${r().layout.iconSize.height}px`,
				transform: u(U(t).path)
			}),
			() => s(U(t))
		]), W("dblclick", i, () => d(U(t))), W("pointerdown", i, (e) => p(U(t), e)), W("pointermove", i, m), W("pointerup", i, _), Mr("pointercancel", i, _), W("contextmenu", i, (e) => void b(U(t), e)), Mr("error", g, () => c(U(t))), Ar(g), q(e, i);
	}), q(e, ie), qe();
}
Nr([
	"dblclick",
	"pointerdown",
	"pointermove",
	"pointerup",
	"contextmenu",
	"keydown"
]);
//#endregion
//#region neoshell/src/Wallpaper.svelte
var ms = /* @__PURE__ */ G("<img class=\"h-full w-full object-cover\" alt=\"\"/>"), hs = /* @__PURE__ */ G("<div class=\"fixed inset-0 bg-base-300\"><!></div>");
function gs(e, t) {
	Ke(t, !0);
	let n = /* @__PURE__ */ N(""), r = /* @__PURE__ */ N(!1);
	wn(() => t.bus.subscribe("config", (e) => {
		let t = i(e.data);
		t !== U(n) && (P(n, t, !0), P(r, !1));
	}));
	function i(e) {
		let t = $($(e).appearance);
		return typeof t.wallpaper == "string" ? t.wallpaper : "";
	}
	var a = hs(), o = I(a), s = (e) => {
		var t = ms();
		z((e) => Q(t, "src", e), [() => `/wallpaper?v=${encodeURIComponent(U(n))}`]), Mr("error", t, () => {
			P(r, !0);
		}), Ar(t), q(e, t);
	};
	Y(o, (e) => {
		U(r) || e(s);
	}), O(a), q(e, a), qe();
}
//#endregion
//#region neoshell/src/Desktop.svelte
var _s = /* @__PURE__ */ G("<div class=\"pointer-events-none absolute rounded-sm border border-primary/70 bg-primary/20\"></div>"), vs = /* @__PURE__ */ G("<div class=\"fixed inset-0 overflow-hidden\" role=\"presentation\"><!> <!> <!> <!></div> <!>", 1);
function ys(e, t) {
	Ke(t, !0);
	let n = 1e4, r = /* @__PURE__ */ N(null), i = /* @__PURE__ */ j(() => a(U(r)));
	wn(() => {
		let e = () => {
			t.store.setViewport(window.innerWidth, window.innerHeight);
		};
		return e(), window.addEventListener("resize", e), () => window.removeEventListener("resize", e);
	}), wn(() => (t.store.schedulePersist(t.store.layout), () => t.store.cancelPersist()));
	function a(e) {
		return e === null ? null : {
			left: Math.min(e.startX, e.x),
			top: Math.min(e.startY, e.y),
			width: Math.abs(e.x - e.startX),
			height: Math.abs(e.y - e.startY)
		};
	}
	function o(e) {
		e.button === 0 && (t.store.clearSelection(), e.currentTarget.setPointerCapture(e.pointerId), P(r, {
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			x: e.clientX,
			y: e.clientY
		}, !0));
	}
	function s(e) {
		U(r) !== null && U(r).pointerId === e.pointerId && (P(r, {
			...U(r),
			x: e.clientX,
			y: e.clientY
		}, !0), t.store.selectPaths(l()));
	}
	function c(e) {
		U(r) !== null && U(r).pointerId === e.pointerId && P(r, null);
	}
	function l() {
		let e = U(i);
		if (e === null) return [];
		let n = [];
		for (let [r, i] of t.store.layout.icons) u(e, i.x, i.y) && n.push(r);
		return n;
	}
	function u(e, n, r) {
		let { width: i, height: a } = t.store.layout.iconSize;
		return n + i < e.left || n > e.left + e.width ? !1 : !(r + a < e.top || r > e.top + e.height);
	}
	async function d(e) {
		e.preventDefault(), t.store.clearSelection(), t.store.openMenu(e.clientX, e.clientY, await f());
	}
	async function f() {
		return [
			{
				label: "Edit Widgets",
				action: () => t.store.openGallery()
			},
			{ separator: !0 },
			{
				label: "New Folder",
				action: h
			},
			{ separator: !0 },
			{
				label: "Sort Icons",
				children: [{
					label: "By Name",
					checked: t.store.sortMode === "name",
					action: () => t.store.sortIcons("name")
				}, {
					label: "By Type",
					checked: t.store.sortMode === "type",
					action: () => t.store.sortIcons("type")
				}]
			},
			{
				label: "Clean Up Icons",
				action: () => t.store.cleanUpIcons()
			},
			{
				label: "Select All",
				action: () => t.store.selectAll()
			},
			{ separator: !0 },
			{
				label: "Change Wallpaper",
				children: await p()
			},
			{
				label: "Lock Desktop",
				checked: t.store.desktopLocked,
				action: () => t.store.setDesktopLocked(!t.store.desktopLocked)
			}
		];
	}
	async function p() {
		let e = m(await t.bus.call("files:images", {}, n));
		return e.length === 0 ? [{
			label: "No images in the wallpaper folder",
			disabled: !0
		}] : e.map((e) => ({
			label: e.name,
			action: () => {
				t.bus.call("config:set", {
					key: "appearance.wallpaper",
					value: e.path
				}, n);
			}
		}));
	}
	function m(e) {
		let t = $(e).entries;
		return Array.isArray(t) ? t : [];
	}
	function h() {
		t.bus.call("files:newfolder", {}, n);
	}
	function g(e) {
		t.store.renamingPath === "" && (e.key === "Escape" && t.store.clearSelection(), e.key === "a" && e.ctrlKey && (e.preventDefault(), t.store.selectAll()), e.key === "Delete" && t.store.selection.size > 0 && (t.bus.call("files:trash", { paths: [...t.store.selection] }, n), t.store.clearSelection()));
	}
	var _ = vs();
	Mr("keydown", sn, g);
	var v = L(_), y = I(v);
	gs(y, { get bus() {
		return t.bus;
	} });
	var b = R(y, 2);
	ps(b, {
		get bus() {
			return t.bus;
		},
		get store() {
			return t.store;
		}
	});
	var x = R(b, 2), S = (e) => {
		var t = _s();
		let n;
		z(() => n = Z(t, "", n, {
			left: `${U(i).left}px`,
			top: `${U(i).top}px`,
			width: `${U(i).width}px`,
			height: `${U(i).height}px`
		})), q(e, t);
	};
	Y(x, (e) => {
		U(i) !== null && e(S);
	}), Mo(R(x, 2), { get guides() {
		return t.store.guides;
	} }), O(v);
	var C = R(v, 2), w = (e) => {
		zo(e, {
			get menu() {
				return t.store.menu;
			},
			onclose: () => t.store.closeMenu()
		});
	};
	Y(C, (e) => {
		t.store.menu !== null && e(w);
	}), W("pointerdown", v, o), W("pointermove", v, s), W("pointerup", v, c), Mr("pointercancel", v, c), W("contextmenu", v, (e) => void d(e)), q(e, _), qe();
}
Nr([
	"pointerdown",
	"pointermove",
	"pointerup",
	"contextmenu"
]);
//#endregion
//#region ../../node_modules/.bun/svelte@5.56.9+ca81d4509358e51d/node_modules/svelte/src/easing/index.js
function bs(e) {
	return e * e * e;
}
function xs(e) {
	let t = e - 1;
	return t * t * t + 1;
}
//#endregion
//#region neoshell/src/WidgetPreview.svelte
var Ss = /* @__PURE__ */ G("<div class=\"pointer-events-none overflow-hidden\"><div></div></div>");
function Cs(e, t) {
	Ke(t, !0);
	let n = /* @__PURE__ */ N(void 0), r = /* @__PURE__ */ j(() => Ko(96, Wo(t.size))), i = /* @__PURE__ */ j(() => t.width / U(r).width);
	wn(() => {
		let e = U(n), r = t.ui.resolve(t.type);
		if (e === void 0 || r === void 0) return;
		let i = r(e, {}, `preview:${t.type}`);
		return () => i.dispose();
	});
	var a = Ss();
	let o;
	var s = I(a);
	let c;
	Xi(s, (e) => P(n, e), () => U(n)), O(a), z(() => {
		o = Z(a, "", o, {
			width: `${t.width}px`,
			height: `${U(r).height * U(i)}px`
		}), c = Z(s, "", c, {
			width: `${U(r).width}px`,
			height: `${U(r).height}px`,
			transform: `scale(${U(i)})`,
			"transform-origin": "top left"
		});
	}), q(e, a), qe();
}
//#endregion
//#region neoshell/src/WidgetGallery.svelte
var ws = /* @__PURE__ */ G("<button type=\"button\"> </button>"), Ts = /* @__PURE__ */ G("<p class=\"text-sm text-base-content/60\">No widgets match.</p>"), Es = /* @__PURE__ */ G("<article class=\"flex cursor-grab flex-col gap-2 touch-none active:cursor-grabbing\" role=\"presentation\"><!> <div class=\"min-w-0\"><div class=\"truncate text-sm font-medium\"> </div> <div class=\"truncate text-xs text-base-content/60\"> </div></div></article>"), Ds = /* @__PURE__ */ G("<div class=\"flex flex-wrap gap-6\"></div>"), Os = /* @__PURE__ */ G("<div class=\"pointer-events-none fixed z-60 overflow-hidden rounded-3xl opacity-80 shadow-2xl\"><!></div>"), ks = /* @__PURE__ */ G("<div class=\"fixed inset-0 z-40\" data-input-region=\"\" role=\"presentation\"></div> <div class=\"fixed bottom-0 left-1/2 z-50 flex h-[46vh] w-[60vw] -translate-x-1/2 overflow-hidden\n      rounded-t-3xl bg-base-300/80 text-base-content shadow-2xl ring-1 ring-base-content/10\n      backdrop-blur-2xl\" data-input-region=\"\" role=\"presentation\"><aside class=\"flex w-56 shrink-0 flex-col gap-3 border-r border-base-content/10 p-4\"><input class=\"w-full rounded-lg bg-base-100/60 px-3 py-1.5 text-sm ring-1 ring-base-content/15\n          outline-none focus:ring-base-content/40\" type=\"search\" placeholder=\"Search Widgets\"/> <nav class=\"flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto\"></nav> <button class=\"rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-content\" type=\"button\">Done</button></aside> <section class=\"min-w-0 flex-1 overflow-y-auto p-6\"><!></section></div> <!>", 1);
function As(e, t) {
	Ke(t, !0);
	let n = "small", r = Ko(96, Wo(n)), i = "All Widgets", a = {
		y: "100%",
		duration: 250,
		easing: xs,
		opacity: 1
	}, o = {
		y: "100%",
		duration: 200,
		easing: bs,
		opacity: 1
	}, s = /* @__PURE__ */ N(!1), c = /* @__PURE__ */ N(F([])), l = /* @__PURE__ */ N(i), u = /* @__PURE__ */ N(""), d = /* @__PURE__ */ N(null), f = /* @__PURE__ */ N(void 0), p = /* @__PURE__ */ j(() => [i, ...S(U(c))]), m = /* @__PURE__ */ j(() => C(U(c), U(l), U(u)));
	wn(() => t.bus.subscribe("widgets:gallery", (e) => {
		P(s, $(e.data).open === !0);
	})), wn(() => t.bus.subscribe("widgets.catalog", (e) => {
		P(c, te($(e.data).widgets), !0);
	}));
	function h() {
		P(s, !1), P(d, null), t.bus.publish("widgets:gallery", { open: !1 });
	}
	function g(e) {
		U(s) && e.key === "Escape" && h();
	}
	function _(e, t) {
		if (t.button !== 0) return;
		t.preventDefault();
		let n = t.currentTarget;
		n.setPointerCapture(t.pointerId);
		let i = n.getBoundingClientRect(), a = r.width / i.width;
		P(d, {
			type: e.type,
			pointerId: t.pointerId,
			x: t.clientX,
			y: t.clientY,
			offsetX: (t.clientX - i.left) * a,
			offsetY: (t.clientY - i.top) * a
		}, !0);
	}
	function v(e) {
		U(d) !== null && U(d).pointerId === e.pointerId && P(d, {
			...U(d),
			x: e.clientX,
			y: e.clientY
		}, !0);
	}
	function y(e) {
		if (U(d) === null || U(d).pointerId !== e.pointerId) return;
		let t = U(d);
		P(d, null), b(t, e);
	}
	function b(e, r) {
		x(r) || (t.bus.publish("widgets:add", {
			type: e.type,
			size: n,
			x: r.clientX - e.offsetX,
			y: r.clientY - e.offsetY
		}), h());
	}
	function x(e) {
		if (U(f) === void 0) return !1;
		let t = U(f).getBoundingClientRect();
		return e.clientX < t.left || e.clientX > t.right ? !1 : e.clientY >= t.top && e.clientY <= t.bottom;
	}
	function S(e) {
		return [...new Set(e.map((e) => e.category))].sort();
	}
	function C(e, t, n) {
		let r = n.trim().toLowerCase();
		return e.filter((e) => w(e, t) && ee(e, r));
	}
	function w(e, t) {
		return t === i || e.category === t;
	}
	function ee(e, t) {
		return t === "" || `${e.name} ${e.category} ${e.description}`.toLowerCase().includes(t);
	}
	function te(e) {
		return Array.isArray(e) ? e.flatMap(ne) : [];
	}
	function ne(e) {
		let t = $(e);
		return typeof t.type != "string" || typeof t.name != "string" ? [] : [{
			type: t.type,
			name: t.name,
			category: re(t.category, "Other"),
			description: re(t.description, "")
		}];
	}
	function re(e, t) {
		return typeof e != "string" || e === "" ? t : e;
	}
	function ie(e, t) {
		return e === t ? "bg-base-content/15 font-medium" : "hover:bg-base-content/10";
	}
	var ae = Hr();
	Mr("keydown", sn, g);
	var oe = L(ae), se = (e) => {
		var i = ks(), s = L(i), c = R(s, 2), g = I(c), b = I(g);
		zi(b);
		var x = R(b, 2);
		ei(x, 20, () => U(p), (e) => e, (e, t) => {
			var n = ws(), r = I(n, !0);
			O(n), z((e) => {
				X(n, 1, `rounded-lg px-3 py-2 text-left text-sm ${e ?? ""}`), J(r, t);
			}, [() => ie(t, U(l))]), W("click", n, () => P(l, t, !0)), q(e, n);
		}), O(x);
		var S = R(x, 2);
		O(g);
		var C = R(g, 2), w = I(C), ee = (e) => {
			q(e, Ts());
		}, te = (e) => {
			var r = Ds();
			ei(r, 21, () => U(m), (e) => e.type, (e, r) => {
				var i = Es(), a = I(i);
				Cs(a, {
					get ui() {
						return t.ui;
					},
					get type() {
						return U(r).type;
					},
					size: n,
					width: 176
				});
				var o = R(a, 2);
				Z(o, "", {}, { width: "176px" });
				var s = I(o), c = I(s, !0);
				O(s);
				var l = R(s, 2), u = I(l, !0);
				O(l), O(o), O(i), z(() => {
					J(c, U(r).name), J(u, U(r).category);
				}), W("pointerdown", i, (e) => _(U(r), e)), W("pointermove", i, v), W("pointerup", i, y), Mr("pointercancel", i, y), q(e, i);
			}), O(r), q(e, r);
		};
		Y(w, (e) => {
			U(m).length === 0 ? e(ee) : e(te, -1);
		}), O(C), O(c), Xi(c, (e) => P(f, e), () => U(f));
		var ne = R(c, 2), re = (e) => {
			var i = Os();
			let a;
			Cs(I(i), {
				get ui() {
					return t.ui;
				},
				get type() {
					return U(d).type;
				},
				size: n,
				get width() {
					return r.width;
				}
			}), O(i), z(() => a = Z(i, "", a, {
				left: `${U(d).x - U(d).offsetX}px`,
				top: `${U(d).y - U(d).offsetY}px`
			})), q(e, i);
		};
		Y(ne, (e) => {
			U(d) !== null && e(re);
		}), W("click", s, h), W("pointermove", s, v), W("pointerup", s, y), Mr("pointercancel", s, y), W("click", c, (e) => e.stopPropagation()), Ki(b, () => U(u), (e) => P(u, e)), W("click", S, h), hi(1, c, () => ca, () => a), hi(2, c, () => ca, () => o), q(e, i);
	};
	Y(oe, (e) => {
		U(s) && e(se);
	}), q(e, ae), qe();
}
Nr([
	"click",
	"pointermove",
	"pointerup",
	"pointerdown"
]);
//#endregion
//#region neoshell/src/widgetCanvas.ts
var js = 4, Ms = "absolute touch-none select-none pointer-events-auto rounded-3xl transition-shadow duration-100 ease-out", Ns = [
	"z-10",
	"cursor-grabbing",
	"shadow-2xl"
], Ps = "pointer-events-none absolute rounded-3xl border-2", Fs = "border-white/80", Is = "border-white/20", Ls = 3e3, Rs = class {
	host;
	store;
	context;
	ui;
	slots = /* @__PURE__ */ new Map();
	reported = /* @__PURE__ */ new Set();
	drag = null;
	preview = null;
	constructor(e, t, n, r) {
		this.host = e, this.store = t, this.context = n, this.ui = r;
	}
	reconcile() {
		let e = this.store.widgetPlacements();
		this.withdrawMissing(new Set(e.map((e) => e.id)));
		for (let t of e) this.sync(t);
	}
	withdrawMissing(e) {
		for (let [t, n] of [...this.slots]) e.has(t) || (this.slots.delete(t), n.fiber.dispose());
	}
	sync(e) {
		let t = this.slots.get(e.id);
		t !== void 0 && t.type !== e.type && (this.slots.delete(e.id), t.fiber.dispose()), this.slots.has(e.id) || this.mount(e), this.place(e);
	}
	mount(e) {
		let t = this.ui.resolve(e.type);
		if (t === void 0) {
			this.reportMissing(e.type);
			return;
		}
		let n = {
			id: e.id,
			type: e.type,
			fiber: null,
			element: null
		};
		n.fiber = this.context.plugin(zs({
			id: e.id,
			host: this.host,
			factory: t,
			onElement: (e) => this.adopt(n, e)
		})), this.slots.set(e.id, n);
	}
	reportMissing(e) {
		this.reported.has(e) || (this.reported.add(e), setTimeout(() => {
			this.ui.resolve(e) === void 0 && console.error(`neoshell: no view registered for widget type "${e}"`);
		}, Ls));
	}
	adopt(e, t) {
		if (e.element = t, t === null) return;
		this.listen(e, t);
		let n = this.store.widgetPlacement(e.id);
		n !== void 0 && this.place(n);
	}
	listen(e, t) {
		t.addEventListener("pointerdown", (t) => this.startDrag(e, t)), t.addEventListener("contextmenu", (t) => this.openMenu(e, t)), t.addEventListener("dragstart", (e) => e.preventDefault());
	}
	place(e) {
		let t = this.slots.get(e.id)?.element;
		t != null && (t.style.left = `${e.point.x}px`, t.style.top = `${e.point.y}px`, t.style.width = `${e.box.width}px`, t.style.height = `${e.box.height}px`);
	}
	startDrag(e, t) {
		if (t.stopPropagation(), t.button !== 0 || !this.store.widgetDraggable(e.id)) return;
		let n = this.store.widgetPlacement(e.id);
		n !== void 0 && e.element !== null && (this.drag !== null && this.abandon(this.drag), this.drag = {
			slot: e,
			pointerId: t.pointerId,
			offsetX: t.clientX - n.point.x,
			offsetY: t.clientY - n.point.y,
			startX: t.clientX,
			startY: t.clientY,
			point: n.point,
			moving: !1,
			untrack: this.trackPointer()
		});
	}
	trackPointer() {
		let e = (e) => this.moveDrag(e), t = (e) => this.endDrag(e);
		return window.addEventListener("pointermove", e), window.addEventListener("pointerup", t), window.addEventListener("pointercancel", t), () => {
			window.removeEventListener("pointermove", e), window.removeEventListener("pointerup", t), window.removeEventListener("pointercancel", t);
		};
	}
	moveDrag(e) {
		let t = this.dragFor(e);
		if (t === null) return;
		let n = this.store.widgetPlacement(t.slot.id);
		if (t.slot.element === null || n === void 0) {
			this.abandon(t);
			return;
		}
		if (!t.moving && !this.beginMoving(t, e)) return;
		let r = {
			x: e.clientX - t.offsetX,
			y: e.clientY - t.offsetY
		};
		t.point = this.store.snapWithoutGuides(r, n.box, [Vs(n)]), t.slot.element.style.left = `${r.x}px`, t.slot.element.style.top = `${r.y}px`;
		let i = this.store.widgetDropAllowed(t.slot.id, t.point);
		this.showPreview(t.point, n.box, i);
	}
	abandon(e) {
		e.untrack(), this.drag = null, this.hidePreview();
	}
	beginMoving(e, t) {
		return Us(e, t) ? (e.moving = !0, e.slot.element?.classList.add(...Ns), !0) : !1;
	}
	endDrag(e) {
		let t = this.dragFor(e);
		t !== null && (t.untrack(), this.drag = null, t.moving && this.finishMove(t));
	}
	finishMove(e) {
		this.hidePreview(), e.slot.element?.classList.remove(...Ns), Ws(e.slot.element), this.store.moveWidget(e.slot.id, e.point);
		let t = this.store.widgetPlacement(e.slot.id);
		t !== void 0 && this.place(t);
	}
	showPreview(e, t, n) {
		this.preview === null && (this.preview = document.createElement("div"), this.host.insertBefore(this.preview, this.host.firstChild)), this.preview.className = `${Ps} ${Hs(n)}`, this.preview.style.left = `${e.x}px`, this.preview.style.top = `${e.y}px`, this.preview.style.width = `${t.width}px`, this.preview.style.height = `${t.height}px`;
	}
	hidePreview() {
		this.preview?.remove(), this.preview = null;
	}
	dragFor(e) {
		return this.drag === null || this.drag.pointerId !== e.pointerId ? null : this.drag;
	}
	openMenu(e, t) {
		t.preventDefault(), t.stopPropagation(), this.store.openMenu(t.clientX, t.clientY, this.menuItems(e.id));
	}
	menuItems(e) {
		let t = this.store.widgetPlacement(e);
		return t === void 0 ? [] : [
			{
				label: "Edit Widgets",
				action: () => this.store.openGallery()
			},
			{ separator: !0 },
			{
				label: "Locked",
				checked: t.locked,
				disabled: this.store.desktopLocked,
				action: () => this.store.setWidgetLocked(e, !t.locked)
			},
			{
				label: "Size",
				children: this.sizeItems(e, t.size)
			},
			{ separator: !0 },
			{
				label: "Remove Widget",
				danger: !0,
				action: () => this.store.removeWidget(e)
			}
		];
	}
	sizeItems(e, t) {
		return Uo.map((n) => ({
			label: Gs(n),
			checked: n === t,
			action: () => this.store.setWidgetSize(e, n)
		}));
	}
};
function zs(e) {
	return {
		name: `widget:${e.id}`,
		apply(t) {
			t.effect(() => Bs(e), `widget ${e.id}`);
		}
	};
}
function Bs(e) {
	let t = document.createElement("div");
	t.className = Ms, t.dataset.widgetId = e.id, e.host.appendChild(t), e.onElement(t);
	let n = e.factory(t, {}, e.id);
	return () => {
		n.dispose(), t.remove(), e.onElement(null);
	};
}
function Vs(e) {
	return {
		x: e.point.x,
		y: e.point.y,
		width: e.box.width,
		height: e.box.height
	};
}
function Hs(e) {
	return e ? Fs : Is;
}
function Us(e, t) {
	let n = t.clientX - e.startX, r = t.clientY - e.startY;
	return Math.hypot(n, r) >= js;
}
function Ws(e) {
	if (e === null) return;
	let t = (e) => {
		e.preventDefault(), e.stopPropagation();
	};
	e.addEventListener("click", t, {
		capture: !0,
		once: !0
	}), setTimeout(() => e.removeEventListener("click", t, { capture: !0 }), 0);
}
function Gs(e) {
	return e.slice(0, 1).toUpperCase() + e.slice(1);
}
//#endregion
//#region neoshell/src/desktopLayout.ts
function Ks(e) {
	let t = Go(e.viewport.width), n = Ko(t, Bo), r = [];
	return {
		widgets: qs(e, t, r),
		iconSize: n,
		icons: Xs(e, n, r)
	};
}
function qs(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e.instances) {
		let a = Js(i, t, e.viewport, n);
		n.push(qo(a.point, a.box)), r.set(i.id, a);
	}
	return r;
}
function Js(e, t, n, r) {
	let i = Ko(t, Wo(e.size));
	return {
		id: e.id,
		type: e.type,
		size: e.size,
		box: i,
		locked: e.locked,
		point: Ys(e.point, i, n, r)
	};
}
function Ys(e, t, n, r) {
	if (e === void 0) return as(t, r, n, !0);
	let i = Xo(e, t, n);
	return Yo(qo(i, t), r) ? as(t, r, n, !0) : i;
}
function Xs(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = [];
	for (let a of e.entries) Zs(e, a.path, t, n, r, i);
	for (let a of i) {
		let i = as(t, n, e.viewport, !1);
		n.push(qo(i, t)), r.set(a, i);
	}
	return r;
}
function Zs(e, t, n, r, i, a) {
	let o = e.storedIcons[t];
	if (o === void 0) {
		a.push(t);
		return;
	}
	let s = Xo(o, n, e.viewport);
	if (Yo(qo(s, n), r)) {
		a.push(t);
		return;
	}
	r.push(qo(s, n)), i.set(t, s);
}
function Qs(e, t, n) {
	let r = [];
	for (let [t, i] of e.widgets) n.has(t) || r.push(qo(i.point, i.box));
	for (let [n, i] of e.icons) t.has(n) || r.push(qo(i, e.iconSize));
	return r;
}
function $s(e, t) {
	let n = [];
	for (let r of e) {
		let e = qo(r, t);
		if (Yo(e, n)) return !1;
		n.push(e);
	}
	return !0;
}
function ec(e) {
	let t = {};
	for (let [n, r] of e.icons) t[n] = r;
	return t;
}
function tc(e, t) {
	let n = Object.keys(e);
	return n.length === Object.keys(t).length && n.every((n) => nc(e[n], t[n]));
}
function nc(e, t) {
	return t !== void 0 && Math.round(e.x) === Math.round(t.x) && Math.round(e.y) === Math.round(t.y);
}
function rc(e, t) {
	return e !== void 0 && nc(t, uc(e));
}
function ic(e, t) {
	return [...e].sort((e, n) => ac(e, n, t));
}
function ac(e, t, n) {
	if (e.directory !== t.directory) return oc(e);
	if (n === "type") {
		let n = sc(e).localeCompare(sc(t));
		if (n !== 0) return n;
	}
	return e.name.toLowerCase().localeCompare(t.name.toLowerCase());
}
function oc(e) {
	return e.directory ? -1 : 1;
}
function sc(e) {
	let t = e.name.lastIndexOf(".");
	return t <= 0 ? "" : e.name.slice(t + 1).toLowerCase();
}
function cc(e, t) {
	let n = {};
	for (let [r, i] of Object.entries($(e))) lc(n, r, i, t);
	return n;
}
function lc(e, t, n, r) {
	let i = uc($(n), r);
	i !== void 0 && (e[t] = i);
}
function uc(e, t = 0) {
	let { x: n, y: r, column: i, row: a } = e;
	if (typeof n == "number" && typeof r == "number") return {
		x: n,
		y: r
	};
	if (typeof i == "number" && typeof a == "number" && t !== 0) return {
		x: 8 + i * (t + 8),
		y: 40 + a * (t + 8)
	};
}
function dc(e, t, n) {
	if (typeof e != "object" || !e) return t.map((e) => fc(e));
	let r = new Map(t.map((e) => [e.id, e.type]));
	return Object.entries($(e)).flatMap(([e, t]) => pc(e, t, n, r));
}
function fc(e) {
	return {
		id: e.id,
		type: e.type,
		size: e.size,
		locked: !1
	};
}
function pc(e, t, n, r) {
	let i = $(t), a = mc(i, e, r);
	return a === "" ? [] : [{
		id: e,
		type: a,
		size: bc(i.size, "small"),
		point: uc(i, n),
		locked: i.locked === !0
	}];
}
function mc(e, t, n) {
	if (typeof e.type == "string" && e.type !== "") return e.type;
	let r = n.get(t);
	return r === void 0 ? "" : r;
}
function hc(e) {
	return Array.isArray(e) ? e.map(gc).filter((e) => e !== null) : [];
}
function gc(e) {
	let t = $(e), { name: n, path: r } = t;
	return typeof n != "string" || typeof r != "string" ? null : {
		name: n,
		path: r,
		directory: t.directory === !0,
		icon: bc(t.icon, "text-x-generic"),
		image: t.image === !0
	};
}
function _c(e) {
	return Array.isArray(e) ? e.flatMap(vc) : [];
}
function vc(e) {
	let t = $(e), { id: n, type: r } = t;
	return typeof n != "string" || n === "" || typeof r != "string" || r === "" ? [] : [{
		id: n,
		type: r,
		size: bc(t.size, "small")
	}];
}
function yc(e, t) {
	let n = e.split(".")[0];
	if (!t.has(n)) return n;
	for (let e = 2;; e += 1) {
		let r = `${n}-${e}`;
		if (!t.has(r)) return r;
	}
}
function bc(e, t) {
	return typeof e != "string" || e === "" ? t : e;
}
//#endregion
//#region neoshell/src/desktopStore.svelte.ts
var xc = 1e4, Sc = 250, Cc = class {
	#e = /* @__PURE__ */ N(F([]));
	get entries() {
		return U(this.#e);
	}
	set entries(e) {
		P(this.#e, e, !0);
	}
	#t = /* @__PURE__ */ N("");
	get desktopDir() {
		return U(this.#t);
	}
	set desktopDir(e) {
		P(this.#t, e, !0);
	}
	#n = /* @__PURE__ */ N(F(/* @__PURE__ */ new Set()));
	get selection() {
		return U(this.#n);
	}
	set selection(e) {
		P(this.#n, e, !0);
	}
	#r = /* @__PURE__ */ N(null);
	get menu() {
		return U(this.#r);
	}
	set menu(e) {
		P(this.#r, e, !0);
	}
	#i = /* @__PURE__ */ N("");
	get renamingPath() {
		return U(this.#i);
	}
	set renamingPath(e) {
		P(this.#i, e, !0);
	}
	#a = /* @__PURE__ */ N(1920);
	get viewportWidth() {
		return U(this.#a);
	}
	set viewportWidth(e) {
		P(this.#a, e, !0);
	}
	#o = /* @__PURE__ */ N(1080);
	get viewportHeight() {
		return U(this.#o);
	}
	set viewportHeight(e) {
		P(this.#o, e, !0);
	}
	#s = /* @__PURE__ */ N(!1);
	get desktopLocked() {
		return U(this.#s);
	}
	set desktopLocked(e) {
		P(this.#s, e, !0);
	}
	#c = /* @__PURE__ */ N("name");
	get sortMode() {
		return U(this.#c);
	}
	set sortMode(e) {
		P(this.#c, e, !0);
	}
	#l = /* @__PURE__ */ N(F([]));
	get guides() {
		return U(this.#l);
	}
	set guides(e) {
		P(this.#l, e, !0);
	}
	#u = /* @__PURE__ */ N(F({}));
	get storedIcons() {
		return U(this.#u);
	}
	set storedIcons(e) {
		P(this.#u, e, !0);
	}
	#d = /* @__PURE__ */ N(null);
	get storedWidgets() {
		return U(this.#d);
	}
	set storedWidgets(e) {
		P(this.#d, e, !0);
	}
	#f = /* @__PURE__ */ N(F([]));
	get seeds() {
		return U(this.#f);
	}
	set seeds(e) {
		P(this.#f, e, !0);
	}
	#p = /* @__PURE__ */ N(!1);
	get folderLoaded() {
		return U(this.#p);
	}
	set folderLoaded(e) {
		P(this.#p, e, !0);
	}
	listeners = /* @__PURE__ */ new Set();
	bus;
	persistTimer = null;
	constructor(e) {
		this.bus = e;
	}
	#m = /* @__PURE__ */ j(() => Go(this.viewportWidth));
	get unit() {
		return U(this.#m);
	}
	set unit(e) {
		P(this.#m, e);
	}
	#h = /* @__PURE__ */ j(() => ({
		width: this.viewportWidth,
		height: this.viewportHeight
	}));
	get viewport() {
		return U(this.#h);
	}
	set viewport(e) {
		P(this.#h, e);
	}
	#g = /* @__PURE__ */ j(() => ic(this.entries, this.sortMode));
	get sortedEntries() {
		return U(this.#g);
	}
	set sortedEntries(e) {
		P(this.#g, e);
	}
	#_ = /* @__PURE__ */ j(() => Ks({
		entries: this.sortedEntries,
		storedIcons: this.storedIcons,
		instances: dc(this.storedWidgets, this.seeds, this.unit),
		viewport: this.viewport
	}));
	get layout() {
		return U(this.#_);
	}
	set layout(e) {
		P(this.#_, e);
	}
	onChange(e) {
		return this.listeners.add(e), () => {
			this.listeners.delete(e);
		};
	}
	setViewport(e, t) {
		this.viewportWidth = e, this.viewportHeight = t, this.notify();
	}
	setSeeds(e) {
		this.seeds = _c(e), this.notify();
	}
	applyDesktopFolder(e) {
		let t = $(e);
		typeof t.path == "string" && (this.desktopDir = t.path), this.entries = hc(t.entries), this.folderLoaded = !0, this.pruneSelection();
	}
	applyConfig(e) {
		let t = $(e), n = $(t.desktop);
		this.storedIcons = cc(t.icons, this.unit), this.storedWidgets = kc(t.widgets), this.desktopLocked = n.locked === !0, this.sortMode = Ac(n.sort), this.notify();
	}
	widgetPlacement(e) {
		return this.layout.widgets.get(e);
	}
	widgetPlacements() {
		return [...this.layout.widgets.values()];
	}
	iconPoint(e) {
		return this.layout.icons.get(e);
	}
	isSelected(e) {
		return this.selection.has(e);
	}
	selectOnly(e) {
		this.selection = /* @__PURE__ */ new Set([e]);
	}
	toggleSelected(e) {
		let t = new Set(this.selection);
		t.delete(e) || t.add(e), this.selection = t;
	}
	selectPaths(e) {
		this.selection = new Set(e);
	}
	clearSelection() {
		this.selection = /* @__PURE__ */ new Set();
	}
	selectAll() {
		this.selection = new Set(this.entries.map((e) => e.path));
	}
	openMenu(e, t, n) {
		this.menu = {
			x: e,
			y: t,
			items: n
		};
	}
	closeMenu() {
		this.menu = null;
	}
	openGallery() {
		this.bus.publish("widgets:gallery", { open: !0 });
	}
	snapDrag(e, t, n) {
		let r = this.snapped(e, t, n);
		return this.guides = r.guides, Xo(r.point, t, this.viewport);
	}
	snapWithoutGuides(e, t, n) {
		return Xo(this.snapped(e, t, n).point, t, this.viewport);
	}
	snapped(e, t, n) {
		return Zo(e, t, this.othersFor(n), this.viewport);
	}
	clearGuides() {
		this.guides = [];
	}
	othersFor(e) {
		return Qs(this.layout, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set()).filter((t) => !e.some((e) => Oc(t, e)));
	}
	moveIcons(e, t) {
		let n = Qs(this.layout, new Set(e), /* @__PURE__ */ new Set());
		if (!$s(t.values(), this.layout.iconSize)) return !1;
		for (let e of t.values()) if (Yo(qo(e, this.layout.iconSize), n)) return !1;
		let r = { ...this.storedIcons };
		for (let [e, n] of t) r[e] = n;
		return this.storedIcons = r, this.writeIcons(r), !0;
	}
	widgetDropAllowed(e, t) {
		let n = this.layout.widgets.get(e);
		if (n === void 0) return !1;
		let r = Qs(this.layout, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set([e]));
		return !Yo(qo(t, n.box), r);
	}
	moveWidget(e, t) {
		return this.widgetDropAllowed(e, t) ? (this.patchWidget(e, {
			x: Math.round(t.x),
			y: Math.round(t.y)
		}), !0) : !1;
	}
	setWidgetLocked(e, t) {
		this.patchWidget(e, { locked: t });
	}
	setWidgetSize(e, t) {
		this.patchWidget(e, {
			size: t,
			...Dc(this, e, t)
		});
	}
	addWidget(e, t, n) {
		let r = this.instanceRecords(), i = yc(e, new Set(Object.keys(r))), a = {
			...r,
			[i]: {
				type: e,
				size: t,
				locked: !1,
				...wc(n)
			}
		};
		return this.writeWidgets(a), i;
	}
	removeWidget(e) {
		let t = { ...this.instanceRecords() };
		delete t[e], this.writeWidgets(t);
	}
	setDesktopLocked(e) {
		this.desktopLocked = e, this.bus.call("config:set", {
			key: "desktop.locked",
			value: e
		}, xc);
	}
	widgetDraggable(e) {
		let t = this.layout.widgets.get(e);
		return t !== void 0 && !this.desktopLocked && !t.locked;
	}
	sortIcons(e) {
		this.sortMode = e, this.bus.call("config:set", {
			key: "desktop.sort",
			value: e
		}, xc), this.cleanUpIcons();
	}
	cleanUpIcons() {
		this.storedIcons = {}, this.writeIcons({});
	}
	schedulePersist(e) {
		this.cancelPersist(), this.folderLoaded && (this.persistTimer = setTimeout(() => {
			this.persistTimer = null, this.persist(e);
		}, Sc));
	}
	cancelPersist() {
		this.persistTimer !== null && (clearTimeout(this.persistTimer), this.persistTimer = null);
	}
	instanceRecords() {
		if (this.storedWidgets !== null) return this.storedWidgets;
		let e = {};
		for (let t of this.layout.widgets.values()) e[t.id] = Tc(t);
		return e;
	}
	persist(e) {
		this.persistIcons(e), this.persistWidgets(e);
	}
	persistIcons(e) {
		let t = ec(e);
		tc(t, this.storedIcons) || (this.storedIcons = t, this.writeIcons(t));
	}
	persistWidgets(e) {
		let t = this.storedWidgets;
		if (t === null) {
			this.writeWidgets(this.instanceRecords());
			return;
		}
		let n = { ...t }, r = !1;
		for (let [t, i] of e.widgets) r = Ec(n, t, i) || r;
		r && this.writeWidgets(n);
	}
	notify() {
		for (let e of this.listeners) e();
	}
	patchWidget(e, t) {
		let n = this.instanceRecords(), r = {
			...n[e],
			...t
		};
		this.writeWidgets({
			...n,
			[e]: r
		});
	}
	writeWidgets(e) {
		this.storedWidgets = e, this.bus.call("config:set", {
			key: "widgets",
			value: e
		}, xc), this.notify();
	}
	writeIcons(e) {
		this.bus.call("config:set", {
			key: "icons",
			value: e
		}, xc), this.notify();
	}
	pruneSelection() {
		let e = new Set(this.entries.map((e) => e.path)), t = new Set([...this.selection].filter((t) => e.has(t)));
		t.size !== this.selection.size && (this.selection = t);
	}
};
function wc(e) {
	return e === void 0 ? {} : {
		x: Math.round(e.x),
		y: Math.round(e.y)
	};
}
function Tc(e) {
	return {
		type: e.type,
		size: e.size,
		locked: e.locked,
		x: Math.round(e.point.x),
		y: Math.round(e.point.y)
	};
}
function Ec(e, t, n) {
	let r = e[t];
	return rc(r, n.point) && r?.type === n.type ? !1 : (e[t] = {
		...r,
		type: n.type,
		x: Math.round(n.point.x),
		y: Math.round(n.point.y)
	}, !0);
}
function Dc(e, t, n) {
	let r = e.widgetPlacement(t);
	if (r === void 0) return {};
	let i = Ko(e.unit, Wo(n)), a = Qs(e.layout, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set([t])), o = Xo(r.point, i, e.viewport);
	return Yo(qo(o, i), a) ? {
		x: void 0,
		y: void 0
	} : {
		x: Math.round(o.x),
		y: Math.round(o.y)
	};
}
function Oc(e, t) {
	return e.x !== t.x || e.y !== t.y ? !1 : e.width === t.width && e.height === t.height;
}
function kc(e) {
	if (typeof e != "object" || !e) return null;
	let t = {};
	for (let [n, r] of Object.entries(e)) t[n] = $(r);
	return t;
}
function Ac(e) {
	return e === "type" ? "type" : "name";
}
//#endregion
//#region neoshell/src/views.ts
var jc = {
	name: "neoshell-views",
	inject: ["ui", "bus"],
	apply(e) {
		let t = ea(e, "ui"), n = ea(e, "bus");
		e.effect(() => Rc()), e.effect(() => t.register("neoshell.topbar", Fc(n))), e.effect(() => t.register("neoshell.notch", Mc(vo, { bus: n }))), e.effect(() => t.register("neoshell.clock", Mc(bo, { bus: n }))), e.effect(() => t.register("neoshell.battery", Mc(Co, { bus: n }))), e.effect(() => t.register("neoshell.dock", Mc(ko, { bus: n }))), e.effect(() => t.register("neoshell.wallpaper", Mc(gs, { bus: n }))), e.effect(() => t.register("neoshell.desktop", Nc(n, e, t))), e.effect(() => t.register("neoshell.widgetgallery", Mc(As, {
			bus: n,
			ui: t
		})));
	}
};
function Mc(e, t) {
	return (n) => {
		let r = Wr(e, {
			target: n,
			props: t
		});
		return { dispose() {
			Jr(r);
		} };
	};
}
function Nc(e, t, n) {
	return (r, i) => {
		let a = new Cc(e);
		a.setSeeds($(i).widgets);
		let o = document.createElement("div");
		o.className = "fixed inset-0 pointer-events-none";
		let s = new Rs(o, a, t, n), c = e.subscribe("config", (e) => {
			a.applyConfig(e.data);
		}), l = e.subscribe("widgets:add", (e) => {
			let t = $(e.data);
			a.addWidget(String(t.type), String(t.size), Pc(t));
		}), u = a.onChange(() => s.reconcile()), d = n.onChange(() => s.reconcile()), f = Wr(ys, {
			target: r,
			props: {
				bus: e,
				store: a
			}
		});
		return r.appendChild(o), s.reconcile(), { dispose() {
			d(), u(), l(), c(), o.remove(), Jr(f);
		} };
	};
}
function Pc(e) {
	let { x: t, y: n } = e;
	if (typeof t == "number" && typeof n == "number") return {
		x: t,
		y: n
	};
}
function Fc(e) {
	return (t, n) => {
		let r = document.createElement("div");
		r.className = "flex shrink-0 items-center gap-4";
		let i = Wr(ra, {
			target: t,
			props: {
				bus: e,
				childrenHost: r,
				centerGap: Ic(n)
			}
		});
		return {
			dispose() {
				Jr(i);
			},
			childrenHost: r
		};
	};
}
function Ic(e) {
	if (typeof e != "object" || !e) return 0;
	let t = e.centerGap;
	return typeof t == "number" ? t : 0;
}
function Lc(e) {
	let t = e.indexOf("?");
	return t < 0 ? "" : e.slice(t);
}
function Rc() {
	if (zc()) return () => {};
	let e = document.createElement("link");
	return e.rel = "stylesheet", e.href = `/plugins/neoshell/views.css${Lc(import.meta.url)}`, document.head.appendChild(e), () => {
		e.remove();
	};
}
function zc() {
	return new URL(import.meta.url).origin !== window.location.origin;
}
//#endregion
export { jc as default };
