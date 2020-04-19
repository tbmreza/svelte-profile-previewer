
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Cue.svelte generated by Svelte v3.19.2 */

    const file = "src\\Cue.svelte";

    function create_fragment(ctx) {
    	let p;
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*cue*/ ctx[0]);
    			attr_dev(p, "class", "svelte-1b6r0fq");
    			add_location(p, file, 39, 0, 853);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    			dispose = listen_dev(p, "click", /*getCue*/ ctx[1], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cue*/ 1) set_data_dev(t, /*cue*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const cueList = [
    		"Where do you see yourself in 5 years?",
    		"You are starting a company. CTO alongside you:",
    		"You are CEO. Your dream COO:",
    		"Appreciate your growth! Four years ago:",
    		"You are founding a startup. Your co-founder:",
    		"My failures in the past shape this:"
    	];

    	let cue = cueList[0];
    	let index = 0;
    	let prevIndex = 0;

    	const getRandomInt = (min, max) => {
    		return Math.floor(Math.random() * (max - min + 1)) + min;
    	};

    	const getCue = () => {
    		do {
    			index = getRandomInt(0, cueList.length - 1);
    			$$invalidate(0, cue = cueList[index]);
    		} while (index === prevIndex);

    		prevIndex = index;
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Cue> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Cue", $$slots, []);

    	$$self.$capture_state = () => ({
    		cueList,
    		cue,
    		index,
    		prevIndex,
    		getRandomInt,
    		getCue
    	});

    	$$self.$inject_state = $$props => {
    		if ("cue" in $$props) $$invalidate(0, cue = $$props.cue);
    		if ("index" in $$props) index = $$props.index;
    		if ("prevIndex" in $$props) prevIndex = $$props.prevIndex;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [cue, getCue];
    }

    class Cue extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cue",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\TopBar.svelte generated by Svelte v3.19.2 */
    const file$1 = "src\\TopBar.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let ul;
    	let li;
    	let current;
    	const cue = new Cue({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");
    			li = element("li");
    			create_component(cue.$$.fragment);
    			set_style(li, "float", "left");
    			attr_dev(li, "class", "svelte-zpx1b9");
    			add_location(li, file$1, 22, 4, 290);
    			attr_dev(ul, "class", "svelte-zpx1b9");
    			add_location(ul, file$1, 21, 2, 281);
    			attr_dev(div, "class", "navbar svelte-zpx1b9");
    			add_location(div, file$1, 20, 0, 258);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);
    			append_dev(ul, li);
    			mount_component(cue, li, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cue.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cue.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(cue);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TopBar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("TopBar", $$slots, []);
    	$$self.$capture_state = () => ({ Cue });
    	return [];
    }

    class TopBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TopBar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\ModalInternals.svelte generated by Svelte v3.19.2 */

    const { console: console_1 } = globals;
    const file$2 = "src\\ModalInternals.svelte";

    function create_fragment$2(ctx) {
    	let div0;
    	let t;
    	let div1;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "modal-background svelte-1ijyhng");
    			add_location(div0, file$2, 71, 0, 1496);
    			attr_dev(div1, "class", "modal svelte-1ijyhng");
    			attr_dev(div1, "role", "dialog");
    			attr_dev(div1, "aria-modal", "true");
    			add_location(div1, file$2, 73, 0, 1555);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			/*div1_binding*/ ctx[8](div1);
    			current = true;

    			dispose = [
    				listen_dev(window, "keydown", /*handleKeydown*/ ctx[2], false, false, false),
    				listen_dev(div0, "click", /*dispatchClose*/ ctx[1], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 64) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[6], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			/*div1_binding*/ ctx[8](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { closeModal } = $$props;
    	const dispatch = createEventDispatcher();
    	const dispatchClose = () => dispatch("close");
    	let modal;

    	const handleKeydown = e => {
    		if (e.key === "Escape") {
    			console.log("handle keydown");
    			dispatchClose();
    			return;
    		}

    		if (e.key === "Tab") {
    			const nodes = modal.querySelectorAll("*");
    			const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);
    			let index = tabbable.indexOf(document.activeElement);
    			if (index === -1 && e.shiftKey) index = 0;
    			index += tabbable.length + (e.shiftKey ? -1 : 1);
    			index %= tabbable.length;
    			tabbable[index].focus();
    			e.preventDefault();
    		}
    	};

    	const previouslyFocused = typeof document !== "undefined" && document.activeElement;

    	if (previouslyFocused) {
    		onDestroy(() => {
    			previouslyFocused.focus();
    		});
    	}

    	const writable_props = ["closeModal"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<ModalInternals> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ModalInternals", $$slots, ['default']);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, modal = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("closeModal" in $$props) $$invalidate(3, closeModal = $$props.closeModal);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		closeModal,
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		dispatchClose,
    		modal,
    		handleKeydown,
    		previouslyFocused
    	});

    	$$self.$inject_state = $$props => {
    		if ("closeModal" in $$props) $$invalidate(3, closeModal = $$props.closeModal);
    		if ("modal" in $$props) $$invalidate(0, modal = $$props.modal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*closeModal*/ 8) {
    			 if (closeModal) {
    				dispatchClose();
    			}
    		}
    	};

    	return [
    		modal,
    		dispatchClose,
    		handleKeydown,
    		closeModal,
    		dispatch,
    		previouslyFocused,
    		$$scope,
    		$$slots,
    		div1_binding
    	];
    }

    class ModalInternals extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { closeModal: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalInternals",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*closeModal*/ ctx[3] === undefined && !("closeModal" in props)) {
    			console_1.warn("<ModalInternals> was created without expected prop 'closeModal'");
    		}
    	}

    	get closeModal() {
    		throw new Error("<ModalInternals>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set closeModal(value) {
    		throw new Error("<ModalInternals>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Modal.svelte generated by Svelte v3.19.2 */

    // (11:0) {#if display}
    function create_if_block(ctx) {
    	let current;

    	const modalinternals = new ModalInternals({
    			props: {
    				closeModal: /*closeModal*/ ctx[1],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modalinternals.$on("close", /*handleClose*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(modalinternals.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modalinternals, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modalinternals_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				modalinternals_changes.$$scope = { dirty, ctx };
    			}

    			modalinternals.$set(modalinternals_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modalinternals.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modalinternals.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modalinternals, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(11:0) {#if display}",
    		ctx
    	});

    	return block;
    }

    // (12:2) <ModalInternals on:close={handleClose} {closeModal}>
    function create_default_slot(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(12:2) <ModalInternals on:close={handleClose} {closeModal}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*display*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*display*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { display } = $$props;
    	let closeModal = false;

    	const handleClose = () => {
    		$$invalidate(0, display = false);
    	};

    	const writable_props = ["display"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Modal", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("display" in $$props) $$invalidate(0, display = $$props.display);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		display,
    		ModalInternals,
    		closeModal,
    		handleClose
    	});

    	$$self.$inject_state = $$props => {
    		if ("display" in $$props) $$invalidate(0, display = $$props.display);
    		if ("closeModal" in $$props) $$invalidate(1, closeModal = $$props.closeModal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [display, closeModal, handleClose, $$slots, $$scope];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { display: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*display*/ ctx[0] === undefined && !("display" in props)) {
    			console.warn("<Modal> was created without expected prop 'display'");
    		}
    	}

    	get display() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set display(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\svg\Path.svelte generated by Svelte v3.19.2 */

    const file$3 = "node_modules\\svelte-awesome\\components\\svg\\Path.svelte";

    function create_fragment$4(ctx) {
    	let path;
    	let path_levels = [{ key: "path-" + /*id*/ ctx[0] }, /*data*/ ctx[1]];
    	let path_data = {};

    	for (let i = 0; i < path_levels.length; i += 1) {
    		path_data = assign(path_data, path_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			set_svg_attributes(path, path_data);
    			add_location(path, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(path, get_spread_update(path_levels, [
    				dirty & /*id*/ 1 && { key: "path-" + /*id*/ ctx[0] },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ["id", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Path> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Path", $$slots, []);

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Path extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Path",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get id() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\svg\Polygon.svelte generated by Svelte v3.19.2 */

    const file$4 = "node_modules\\svelte-awesome\\components\\svg\\Polygon.svelte";

    function create_fragment$5(ctx) {
    	let polygon;
    	let polygon_levels = [{ key: "polygon-" + /*id*/ ctx[0] }, /*data*/ ctx[1]];
    	let polygon_data = {};

    	for (let i = 0; i < polygon_levels.length; i += 1) {
    		polygon_data = assign(polygon_data, polygon_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			polygon = svg_element("polygon");
    			set_svg_attributes(polygon, polygon_data);
    			add_location(polygon, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polygon, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(polygon, get_spread_update(polygon_levels, [
    				dirty & /*id*/ 1 && { key: "polygon-" + /*id*/ ctx[0] },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polygon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ["id", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Polygon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Polygon", $$slots, []);

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Polygon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Polygon",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get id() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\svg\Raw.svelte generated by Svelte v3.19.2 */

    const file$5 = "node_modules\\svelte-awesome\\components\\svg\\Raw.svelte";

    function create_fragment$6(ctx) {
    	let g;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			add_location(g, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			g.innerHTML = /*raw*/ ctx[0];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*raw*/ 1) g.innerHTML = /*raw*/ ctx[0];		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let cursor = 870711;

    	function getId() {
    		cursor += 1;
    		return `fa-${cursor.toString(16)}`;
    	}

    	let raw;
    	let { data } = $$props;

    	function getRaw(data) {
    		if (!data || !data.raw) {
    			return null;
    		}

    		let rawData = data.raw;
    		const ids = {};

    		rawData = rawData.replace(/\s(?:xml:)?id=["']?([^"')\s]+)/g, (match, id) => {
    			const uniqueId = getId();
    			ids[id] = uniqueId;
    			return ` id="${uniqueId}"`;
    		});

    		rawData = rawData.replace(/#(?:([^'")\s]+)|xpointer\(id\((['"]?)([^')]+)\2\)\))/g, (match, rawId, _, pointerId) => {
    			const id = rawId || pointerId;

    			if (!id || !ids[id]) {
    				return match;
    			}

    			return `#${ids[id]}`;
    		});

    		return rawData;
    	}

    	const writable_props = ["data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Raw> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Raw", $$slots, []);

    	$$self.$set = $$props => {
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ cursor, getId, raw, data, getRaw });

    	$$self.$inject_state = $$props => {
    		if ("cursor" in $$props) cursor = $$props.cursor;
    		if ("raw" in $$props) $$invalidate(0, raw = $$props.raw);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 2) {
    			 $$invalidate(0, raw = getRaw(data));
    		}
    	};

    	return [raw, data];
    }

    class Raw extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Raw",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[1] === undefined && !("data" in props)) {
    			console.warn("<Raw> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<Raw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Raw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\svg\Svg.svelte generated by Svelte v3.19.2 */

    const file$6 = "node_modules\\svelte-awesome\\components\\svg\\Svg.svelte";

    function create_fragment$7(ctx) {
    	let svg;
    	let svg_class_value;
    	let svg_role_value;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			if (default_slot) default_slot.c();
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "class", svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an");
    			attr_dev(svg, "x", /*x*/ ctx[8]);
    			attr_dev(svg, "y", /*y*/ ctx[9]);
    			attr_dev(svg, "width", /*width*/ ctx[1]);
    			attr_dev(svg, "height", /*height*/ ctx[2]);
    			attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			attr_dev(svg, "role", svg_role_value = /*label*/ ctx[11] ? "img" : "presentation");
    			attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			attr_dev(svg, "style", /*style*/ ctx[10]);
    			toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === "horizontal");
    			toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === "vertical");
    			add_location(svg, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			if (default_slot) {
    				default_slot.m(svg, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4096) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[12], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[12], dirty, null));
    			}

    			if (!current || dirty & /*className*/ 1 && svg_class_value !== (svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an")) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (!current || dirty & /*x*/ 256) {
    				attr_dev(svg, "x", /*x*/ ctx[8]);
    			}

    			if (!current || dirty & /*y*/ 512) {
    				attr_dev(svg, "y", /*y*/ ctx[9]);
    			}

    			if (!current || dirty & /*width*/ 2) {
    				attr_dev(svg, "width", /*width*/ ctx[1]);
    			}

    			if (!current || dirty & /*height*/ 4) {
    				attr_dev(svg, "height", /*height*/ ctx[2]);
    			}

    			if (!current || dirty & /*label*/ 2048) {
    				attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			}

    			if (!current || dirty & /*label*/ 2048 && svg_role_value !== (svg_role_value = /*label*/ ctx[11] ? "img" : "presentation")) {
    				attr_dev(svg, "role", svg_role_value);
    			}

    			if (!current || dirty & /*box*/ 8) {
    				attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			}

    			if (!current || dirty & /*style*/ 1024) {
    				attr_dev(svg, "style", /*style*/ ctx[10]);
    			}

    			if (dirty & /*className, spin*/ 17) {
    				toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			}

    			if (dirty & /*className, pulse*/ 65) {
    				toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			}

    			if (dirty & /*className, inverse*/ 33) {
    				toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === "horizontal");
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === "vertical");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { class: className } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	let { box } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { x = undefined } = $$props;
    	let { y = undefined } = $$props;
    	let { style = undefined } = $$props;
    	let { label = undefined } = $$props;

    	const writable_props = [
    		"class",
    		"width",
    		"height",
    		"box",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"x",
    		"y",
    		"style",
    		"label"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Svg> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Svg", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, className = $$props.class);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("box" in $$props) $$invalidate(3, box = $$props.box);
    		if ("spin" in $$props) $$invalidate(4, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(7, flip = $$props.flip);
    		if ("x" in $$props) $$invalidate(8, x = $$props.x);
    		if ("y" in $$props) $$invalidate(9, y = $$props.y);
    		if ("style" in $$props) $$invalidate(10, style = $$props.style);
    		if ("label" in $$props) $$invalidate(11, label = $$props.label);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label
    	});

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("box" in $$props) $$invalidate(3, box = $$props.box);
    		if ("spin" in $$props) $$invalidate(4, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(7, flip = $$props.flip);
    		if ("x" in $$props) $$invalidate(8, x = $$props.x);
    		if ("y" in $$props) $$invalidate(9, y = $$props.y);
    		if ("style" in $$props) $$invalidate(10, style = $$props.style);
    		if ("label" in $$props) $$invalidate(11, label = $$props.label);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label,
    		$$scope,
    		$$slots
    	];
    }

    class Svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			class: 0,
    			width: 1,
    			height: 2,
    			box: 3,
    			spin: 4,
    			inverse: 5,
    			pulse: 6,
    			flip: 7,
    			x: 8,
    			y: 9,
    			style: 10,
    			label: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Svg",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*className*/ ctx[0] === undefined && !("class" in props)) {
    			console.warn("<Svg> was created without expected prop 'class'");
    		}

    		if (/*width*/ ctx[1] === undefined && !("width" in props)) {
    			console.warn("<Svg> was created without expected prop 'width'");
    		}

    		if (/*height*/ ctx[2] === undefined && !("height" in props)) {
    			console.warn("<Svg> was created without expected prop 'height'");
    		}

    		if (/*box*/ ctx[3] === undefined && !("box" in props)) {
    			console.warn("<Svg> was created without expected prop 'box'");
    		}
    	}

    	get class() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get box() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set box(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\Icon.svelte generated by Svelte v3.19.2 */

    const { Object: Object_1, console: console_1$1 } = globals;

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    // (4:4) {#if self}
    function create_if_block$1(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*self*/ ctx[0].paths && create_if_block_3(ctx);
    	let if_block1 = /*self*/ ctx[0].polygons && create_if_block_2(ctx);
    	let if_block2 = /*self*/ ctx[0].raw && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*self*/ ctx[0].paths) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[0].polygons) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[0].raw) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(4:4) {#if self}",
    		ctx
    	});

    	return block;
    }

    // (5:6) {#if self.paths}
    function create_if_block_3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*self*/ ctx[0].paths;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 1) {
    				each_value_1 = /*self*/ ctx[0].paths;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(5:6) {#if self.paths}",
    		ctx
    	});

    	return block;
    }

    // (6:8) {#each self.paths as path, i}
    function create_each_block_1(ctx) {
    	let current;

    	const path = new Path({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*path*/ ctx[32]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(path.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(path, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const path_changes = {};
    			if (dirty[0] & /*self*/ 1) path_changes.data = /*path*/ ctx[32];
    			path.$set(path_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(path.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(path.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(path, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(6:8) {#each self.paths as path, i}",
    		ctx
    	});

    	return block;
    }

    // (10:6) {#if self.polygons}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*self*/ ctx[0].polygons;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 1) {
    				each_value = /*self*/ ctx[0].polygons;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(10:6) {#if self.polygons}",
    		ctx
    	});

    	return block;
    }

    // (11:8) {#each self.polygons as polygon, i}
    function create_each_block(ctx) {
    	let current;

    	const polygon = new Polygon({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*polygon*/ ctx[29]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(polygon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(polygon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const polygon_changes = {};
    			if (dirty[0] & /*self*/ 1) polygon_changes.data = /*polygon*/ ctx[29];
    			polygon.$set(polygon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(polygon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(polygon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(polygon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:8) {#each self.polygons as polygon, i}",
    		ctx
    	});

    	return block;
    }

    // (15:6) {#if self.raw}
    function create_if_block_1(ctx) {
    	let updating_data;
    	let current;

    	function raw_data_binding(value) {
    		/*raw_data_binding*/ ctx[27].call(null, value);
    	}

    	let raw_props = {};

    	if (/*self*/ ctx[0] !== void 0) {
    		raw_props.data = /*self*/ ctx[0];
    	}

    	const raw = new Raw({ props: raw_props, $$inline: true });
    	binding_callbacks.push(() => bind(raw, "data", raw_data_binding));

    	const block = {
    		c: function create() {
    			create_component(raw.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(raw, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const raw_changes = {};

    			if (!updating_data && dirty[0] & /*self*/ 1) {
    				updating_data = true;
    				raw_changes.data = /*self*/ ctx[0];
    				add_flush_callback(() => updating_data = false);
    			}

    			raw.$set(raw_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(raw.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(raw.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(raw, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:6) {#if self.raw}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>
    function create_default_slot$1(ctx) {
    	let if_block_anchor;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[26].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[28], null);
    	let if_block = /*self*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (!default_slot) {
    				if (if_block) if_block.c();
    				if_block_anchor = empty();
    			}

    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (!default_slot) {
    				if (if_block) if_block.m(target, anchor);
    				insert_dev(target, if_block_anchor, anchor);
    			}

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!default_slot) {
    				if (/*self*/ ctx[0]) {
    					if (if_block) {
    						if_block.p(ctx, dirty);
    						transition_in(if_block, 1);
    					} else {
    						if_block = create_if_block$1(ctx);
    						if_block.c();
    						transition_in(if_block, 1);
    						if_block.m(if_block_anchor.parentNode, if_block_anchor);
    					}
    				} else if (if_block) {
    					group_outros();

    					transition_out(if_block, 1, 1, () => {
    						if_block = null;
    					});

    					check_outros();
    				}
    			}

    			if (default_slot && default_slot.p && dirty[0] & /*$$scope*/ 268435456) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[28], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[28], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (!default_slot) {
    				if (if_block) if_block.d(detaching);
    				if (detaching) detach_dev(if_block_anchor);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let current;

    	const svg = new Svg({
    			props: {
    				label: /*label*/ ctx[6],
    				width: /*width*/ ctx[7],
    				height: /*height*/ ctx[8],
    				box: /*box*/ ctx[10],
    				style: /*combinedStyle*/ ctx[9],
    				spin: /*spin*/ ctx[2],
    				flip: /*flip*/ ctx[5],
    				inverse: /*inverse*/ ctx[3],
    				pulse: /*pulse*/ ctx[4],
    				class: /*className*/ ctx[1],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(svg.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(svg, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const svg_changes = {};
    			if (dirty[0] & /*label*/ 64) svg_changes.label = /*label*/ ctx[6];
    			if (dirty[0] & /*width*/ 128) svg_changes.width = /*width*/ ctx[7];
    			if (dirty[0] & /*height*/ 256) svg_changes.height = /*height*/ ctx[8];
    			if (dirty[0] & /*box*/ 1024) svg_changes.box = /*box*/ ctx[10];
    			if (dirty[0] & /*combinedStyle*/ 512) svg_changes.style = /*combinedStyle*/ ctx[9];
    			if (dirty[0] & /*spin*/ 4) svg_changes.spin = /*spin*/ ctx[2];
    			if (dirty[0] & /*flip*/ 32) svg_changes.flip = /*flip*/ ctx[5];
    			if (dirty[0] & /*inverse*/ 8) svg_changes.inverse = /*inverse*/ ctx[3];
    			if (dirty[0] & /*pulse*/ 16) svg_changes.pulse = /*pulse*/ ctx[4];
    			if (dirty[0] & /*className*/ 2) svg_changes.class = /*className*/ ctx[1];

    			if (dirty[0] & /*$$scope, self*/ 268435457) {
    				svg_changes.$$scope = { dirty, ctx };
    			}

    			svg.$set(svg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(svg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function normaliseData(data) {
    	if ("iconName" in data && "icon" in data) {
    		let normalisedData = {};
    		let faIcon = data.icon;
    		let name = data.iconName;
    		let width = faIcon[0];
    		let height = faIcon[1];
    		let paths = faIcon[4];
    		let iconData = { width, height, paths: [{ d: paths }] };
    		normalisedData[name] = iconData;
    		return normalisedData;
    	}

    	return data;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { class: className = "" } = $$props;
    	let { data } = $$props;
    	let { scale = 1 } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { label = null } = $$props;
    	let { self = null } = $$props;
    	let { style = null } = $$props;

    	// internal
    	let x = 0;

    	let y = 0;
    	let childrenHeight = 0;
    	let childrenWidth = 0;
    	let outerScale = 1;
    	let width;
    	let height;
    	let combinedStyle;
    	let box;

    	function init() {
    		if (typeof data === "undefined") {
    			return;
    		}

    		const normalisedData = normaliseData(data);
    		const [name] = Object.keys(normalisedData);
    		const icon = normalisedData[name];

    		if (!icon.paths) {
    			icon.paths = [];
    		}

    		if (icon.d) {
    			icon.paths.push({ d: icon.d });
    		}

    		if (!icon.polygons) {
    			icon.polygons = [];
    		}

    		if (icon.points) {
    			icon.polygons.push({ points: icon.points });
    		}

    		$$invalidate(0, self = icon);
    	}

    	function normalisedScale() {
    		let numScale = 1;

    		if (typeof scale !== "undefined") {
    			numScale = Number(scale);
    		}

    		if (isNaN(numScale) || numScale <= 0) {
    			// eslint-disable-line no-restricted-globals
    			console.warn("Invalid prop: prop \"scale\" should be a number over 0."); // eslint-disable-line no-console

    			return outerScale;
    		}

    		return numScale * outerScale;
    	}

    	function calculateBox() {
    		if (self) {
    			return `0 0 ${self.width} ${self.height}`;
    		}

    		return `0 0 ${width} ${height}`;
    	}

    	function calculateRatio() {
    		if (!self) {
    			return 1;
    		}

    		return Math.max(self.width, self.height) / 16;
    	}

    	function calculateWidth() {
    		if (childrenWidth) {
    			return childrenWidth;
    		}

    		if (self) {
    			return self.width / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateHeight() {
    		if (childrenHeight) {
    			return childrenHeight;
    		}

    		if (self) {
    			return self.height / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateStyle() {
    		let combined = "";

    		if (style !== null) {
    			combined += style;
    		}

    		let size = normalisedScale();

    		if (size === 1) {
    			return combined;
    		}

    		if (combined !== "" && !combined.endsWith(";")) {
    			combined += "; ";
    		}

    		return `${combined}font-size: ${size}em`;
    	}

    	const writable_props = [
    		"class",
    		"data",
    		"scale",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"label",
    		"self",
    		"style"
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Icon", $$slots, ['default']);

    	function raw_data_binding(value) {
    		self = value;
    		$$invalidate(0, self);
    	}

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(1, className = $$props.class);
    		if ("data" in $$props) $$invalidate(11, data = $$props.data);
    		if ("scale" in $$props) $$invalidate(12, scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(3, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(5, flip = $$props.flip);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("self" in $$props) $$invalidate(0, self = $$props.self);
    		if ("style" in $$props) $$invalidate(13, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(28, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		Path,
    		Polygon,
    		Raw,
    		Svg,
    		className,
    		data,
    		scale,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		self,
    		style,
    		x,
    		y,
    		childrenHeight,
    		childrenWidth,
    		outerScale,
    		width,
    		height,
    		combinedStyle,
    		box,
    		init,
    		normaliseData,
    		normalisedScale,
    		calculateBox,
    		calculateRatio,
    		calculateWidth,
    		calculateHeight,
    		calculateStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    		if ("data" in $$props) $$invalidate(11, data = $$props.data);
    		if ("scale" in $$props) $$invalidate(12, scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(3, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(5, flip = $$props.flip);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("self" in $$props) $$invalidate(0, self = $$props.self);
    		if ("style" in $$props) $$invalidate(13, style = $$props.style);
    		if ("x" in $$props) x = $$props.x;
    		if ("y" in $$props) y = $$props.y;
    		if ("childrenHeight" in $$props) childrenHeight = $$props.childrenHeight;
    		if ("childrenWidth" in $$props) childrenWidth = $$props.childrenWidth;
    		if ("outerScale" in $$props) outerScale = $$props.outerScale;
    		if ("width" in $$props) $$invalidate(7, width = $$props.width);
    		if ("height" in $$props) $$invalidate(8, height = $$props.height);
    		if ("combinedStyle" in $$props) $$invalidate(9, combinedStyle = $$props.combinedStyle);
    		if ("box" in $$props) $$invalidate(10, box = $$props.box);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*data*/ 2048) {
    			 {
    				init();
    				$$invalidate(7, width = calculateWidth());
    				$$invalidate(8, height = calculateHeight());
    				$$invalidate(9, combinedStyle = calculateStyle());
    				$$invalidate(10, box = calculateBox());
    			}
    		}
    	};

    	return [
    		self,
    		className,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		width,
    		height,
    		combinedStyle,
    		box,
    		data,
    		scale,
    		style,
    		x,
    		y,
    		childrenHeight,
    		childrenWidth,
    		outerScale,
    		init,
    		normalisedScale,
    		calculateBox,
    		calculateRatio,
    		calculateWidth,
    		calculateHeight,
    		calculateStyle,
    		$$slots,
    		raw_data_binding,
    		$$scope
    	];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$8,
    			create_fragment$8,
    			safe_not_equal,
    			{
    				class: 1,
    				data: 11,
    				scale: 12,
    				spin: 2,
    				inverse: 3,
    				pulse: 4,
    				flip: 5,
    				label: 6,
    				self: 0,
    				style: 13
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[11] === undefined && !("data" in props)) {
    			console_1$1.warn("<Icon> was created without expected prop 'data'");
    		}
    	}

    	get class() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get self() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set self(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var edit = { edit: { width: 1792, height: 1792, paths: [{ d: 'M888 1184l116-116-152-152-116 116v56h96v96h56zM1328 464q-16-16-33 1l-350 350q-17 17-1 33t33-1l350-350q17-17 1-33zM1408 1058v190q0 119-84.5 203.5t-203.5 84.5h-832q-119 0-203.5-84.5t-84.5-203.5v-832q0-119 84.5-203.5t203.5-84.5h832q63 0 117 25 15 7 18 23 3 17-9 29l-49 49q-14 14-32 8-23-6-45-6h-832q-66 0-113 47t-47 113v832q0 66 47 113t113 47h832q66 0 113-47t47-113v-126q0-13 9-22l64-64q15-15 35-7t20 29zM1312 320l288 288-672 672h-288v-288zM1756 452l-92 92-288-288 92-92q28-28 68-28t68 28l152 152q28 28 28 68t-28 68z' }] } };

    var plus = { plus: { width: 1408, height: 1792, paths: [{ d: 'M1408 736v192q0 40-28 68t-68 28h-416v416q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-416h-416q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h416v-416q0-40 28-68t68-28h192q40 0 68 28t28 68v416h416q40 0 68 28t28 68z' }] } };

    /* src\EditButton.svelte generated by Svelte v3.19.2 */
    const file$7 = "src\\EditButton.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let current;
    	let dispose;

    	const icon = new Icon({
    			props: { data: edit, scale: "1.2" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(icon.$$.fragment);
    			attr_dev(div, "class", "i svelte-ywjxlb");
    			add_location(div, file$7, 22, 0, 463);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(icon, div, null);
    			current = true;
    			dispose = listen_dev(div, "click", /*dispatchClickEdit*/ ctx[0], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const dispatchClickEdit = () => dispatch("clickEdit");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditButton> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("EditButton", $$slots, []);

    	$$self.$capture_state = () => ({
    		Icon,
    		edit,
    		createEventDispatcher,
    		dispatch,
    		dispatchClickEdit
    	});

    	return [dispatchClickEdit];
    }

    class EditButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditButton",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\Card.svelte generated by Svelte v3.19.2 */

    const file$8 = "src\\Card.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "card svelte-1r53jf2");
    			add_location(div, file$8, 15, 0, 323);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 1) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Card", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, $$slots];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\SectionCard.svelte generated by Svelte v3.19.2 */
    const file$9 = "src\\SectionCard.svelte";

    // (15:0) <Card>
    function create_default_slot$2(ctx) {
    	let h3;
    	let t0;
    	let t1;
    	let t2;
    	let current;
    	const editbutton = new EditButton({ $$inline: true });
    	editbutton.$on("clickEdit", /*clickEdit_handler*/ ctx[2]);
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(/*section*/ ctx[0]);
    			t1 = space();
    			create_component(editbutton.$$.fragment);
    			t2 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(h3, "class", "svelte-76h5kj");
    			add_location(h3, file$9, 15, 2, 215);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			insert_dev(target, t1, anchor);
    			mount_component(editbutton, target, anchor);
    			insert_dev(target, t2, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*section*/ 1) set_data_dev(t0, /*section*/ ctx[0]);

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 8) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editbutton.$$.fragment, local);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editbutton.$$.fragment, local);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			destroy_component(editbutton, detaching);
    			if (detaching) detach_dev(t2);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(15:0) <Card>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let current;

    	const card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(card.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, section*/ 9) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { section } = $$props;
    	const writable_props = ["section"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SectionCard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("SectionCard", $$slots, ['default']);

    	function clickEdit_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("section" in $$props) $$invalidate(0, section = $$props.section);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ section, EditButton, Card });

    	$$self.$inject_state = $$props => {
    		if ("section" in $$props) $$invalidate(0, section = $$props.section);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [section, $$slots, clickEdit_handler, $$scope];
    }

    class SectionCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { section: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SectionCard",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*section*/ ctx[0] === undefined && !("section" in props)) {
    			console.warn("<SectionCard> was created without expected prop 'section'");
    		}
    	}

    	get section() {
    		throw new Error("<SectionCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set section(value) {
    		throw new Error("<SectionCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const about = writable(
      "I help IDEMIA develop and test Card Personalization System Mobile Card Configurator."
    );
    const blockId = writable(0);
    const xpList = writable([
      {
        id: 0,
        title: "Web developer",
        employment: "Full-time",
        location: "Jakarta",
        start: "2020-04-30",
        end: {
          present: false,
          endDate: "2025-01-31",
        },
        desc: "Various projects.",
      },
      {
        id: 1,
        title: "Senior Engineer",
        employment: "Part-time",
        location: "Lampung",
        start: "2005-06-04",
        end: {
          present: true,
          endDate: "2000-01-01",
        },
        desc: "Responsible for core functionality.",
      },
    ]);

    /* src\AboutForm.svelte generated by Svelte v3.19.2 */
    const file$a = "src\\AboutForm.svelte";

    function create_fragment$c(ctx) {
    	let button0;
    	let t1;
    	let textarea;
    	let t2;
    	let div;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Cancel";
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			div = element("div");
    			button1 = element("button");
    			button1.textContent = "Save changes";
    			attr_dev(button0, "class", "btn");
    			add_location(button0, file$a, 26, 0, 450);
    			attr_dev(textarea, "class", "textarea--full-width svelte-pbb9in");
    			add_location(textarea, file$a, 28, 0, 518);
    			attr_dev(button1, "class", "btn");
    			add_location(button1, file$a, 31, 2, 607);
    			attr_dev(div, "class", "actions svelte-pbb9in");
    			add_location(div, file$a, 30, 0, 582);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*draft*/ ctx[0]);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, button1);

    			dispose = [
    				listen_dev(button0, "click", /*dispatchCloseForm*/ ctx[1], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[5]),
    				listen_dev(button1, "click", /*clickSave*/ ctx[2], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*draft*/ 1) {
    				set_input_value(textarea, /*draft*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let $about;
    	validate_store(about, "about");
    	component_subscribe($$self, about, $$value => $$invalidate(3, $about = $$value));
    	const dispatch = createEventDispatcher();

    	const dispatchCloseForm = () => {
    		dispatch("closeForm");
    	};

    	let draft = $about;

    	const clickSave = () => {
    		set_store_value(about, $about = draft);
    		dispatchCloseForm();
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AboutForm> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AboutForm", $$slots, []);

    	function textarea_input_handler() {
    		draft = this.value;
    		$$invalidate(0, draft);
    	}

    	$$self.$capture_state = () => ({
    		about,
    		createEventDispatcher,
    		dispatch,
    		dispatchCloseForm,
    		draft,
    		clickSave,
    		$about
    	});

    	$$self.$inject_state = $$props => {
    		if ("draft" in $$props) $$invalidate(0, draft = $$props.draft);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [draft, dispatchCloseForm, clickSave, $about, dispatch, textarea_input_handler];
    }

    class AboutForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AboutForm",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src\About.svelte generated by Svelte v3.19.2 */
    const file$b = "src\\About.svelte";

    // (25:0) <SectionCard section="About" on:clickEdit={clickEdit}>
    function create_default_slot_1(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*$about*/ ctx[1]);
    			attr_dev(p, "class", "about svelte-1cbkodk");
    			add_location(p, file$b, 25, 2, 483);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$about*/ 2) set_data_dev(t, /*$about*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(25:0) <SectionCard section=\\\"About\\\" on:clickEdit={clickEdit}>",
    		ctx
    	});

    	return block;
    }

    // (30:0) <Modal bind:display={showMdl}>
    function create_default_slot$3(ctx) {
    	let current;
    	const aboutform = new AboutForm({ $$inline: true });
    	aboutform.$on("closeForm", /*closeMdl*/ ctx[3]);

    	const block = {
    		c: function create() {
    			create_component(aboutform.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(aboutform, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(aboutform.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(aboutform.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(aboutform, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(30:0) <Modal bind:display={showMdl}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let t;
    	let updating_display;
    	let current;

    	const sectioncard = new SectionCard({
    			props: {
    				section: "About",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	sectioncard.$on("clickEdit", /*clickEdit*/ ctx[2]);

    	function modal_display_binding(value) {
    		/*modal_display_binding*/ ctx[4].call(null, value);
    	}

    	let modal_props = {
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	};

    	if (/*showMdl*/ ctx[0] !== void 0) {
    		modal_props.display = /*showMdl*/ ctx[0];
    	}

    	const modal = new Modal({ props: modal_props, $$inline: true });
    	binding_callbacks.push(() => bind(modal, "display", modal_display_binding));

    	const block = {
    		c: function create() {
    			create_component(sectioncard.$$.fragment);
    			t = space();
    			create_component(modal.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(sectioncard, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const sectioncard_changes = {};

    			if (dirty & /*$$scope, $about*/ 34) {
    				sectioncard_changes.$$scope = { dirty, ctx };
    			}

    			sectioncard.$set(sectioncard_changes);
    			const modal_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_display && dirty & /*showMdl*/ 1) {
    				updating_display = true;
    				modal_changes.display = /*showMdl*/ ctx[0];
    				add_flush_callback(() => updating_display = false);
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sectioncard.$$.fragment, local);
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sectioncard.$$.fragment, local);
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sectioncard, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let $about;
    	validate_store(about, "about");
    	component_subscribe($$self, about, $$value => $$invalidate(1, $about = $$value));
    	let showMdl = false;

    	const clickEdit = () => {
    		$$invalidate(0, showMdl = true);
    	};

    	const closeMdl = () => {
    		$$invalidate(0, showMdl = false);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("About", $$slots, []);

    	function modal_display_binding(value) {
    		showMdl = value;
    		$$invalidate(0, showMdl);
    	}

    	$$self.$capture_state = () => ({
    		Modal,
    		SectionCard,
    		AboutForm,
    		about,
    		showMdl,
    		clickEdit,
    		closeMdl,
    		$about
    	});

    	$$self.$inject_state = $$props => {
    		if ("showMdl" in $$props) $$invalidate(0, showMdl = $$props.showMdl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [showMdl, $about, clickEdit, closeMdl, modal_display_binding];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src\ExperienceBlock.svelte generated by Svelte v3.19.2 */
    const file$c = "src\\ExperienceBlock.svelte";

    function create_fragment$e(ctx) {
    	let div;
    	let p0;
    	let t0_value = /*xp*/ ctx[1].title + "";
    	let t0;
    	let t1;
    	let p1;
    	let t2_value = /*xp*/ ctx[1].start.slice(0, 4) + "";
    	let t2;
    	let t3;

    	let t4_value = (/*xp*/ ctx[1].end.present
    	? "present"
    	: /*xp*/ ctx[1].end.endDate.slice(0, 4)) + "";

    	let t4;
    	let t5;
    	let p2;
    	let t6_value = /*xp*/ ctx[1].location + "";
    	let t6;
    	let t7;
    	let t8_value = /*xp*/ ctx[1].employment + "";
    	let t8;
    	let t9;
    	let p3;
    	let t10_value = /*xp*/ ctx[1].desc + "";
    	let t10;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = text("–");
    			t4 = text(t4_value);
    			t5 = space();
    			p2 = element("p");
    			t6 = text(t6_value);
    			t7 = text(" · ");
    			t8 = text(t8_value);
    			t9 = space();
    			p3 = element("p");
    			t10 = text(t10_value);
    			attr_dev(p0, "class", "block__title svelte-mn7n6u");
    			add_location(p0, file$c, 44, 2, 921);
    			attr_dev(p1, "class", "block__term svelte-mn7n6u");
    			add_location(p1, file$c, 45, 2, 962);
    			attr_dev(p2, "class", "block__caption svelte-mn7n6u");
    			add_location(p2, file$c, 48, 2, 1080);
    			attr_dev(p3, "class", "block__desc svelte-mn7n6u");
    			add_location(p3, file$c, 49, 2, 1149);
    			attr_dev(div, "class", "block svelte-mn7n6u");
    			toggle_class(div, "block--edit", /*hoverPointer*/ ctx[0]);
    			add_location(div, file$c, 43, 0, 844);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(div, t1);
    			append_dev(div, p1);
    			append_dev(p1, t2);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			append_dev(div, t5);
    			append_dev(div, p2);
    			append_dev(p2, t6);
    			append_dev(p2, t7);
    			append_dev(p2, t8);
    			append_dev(div, t9);
    			append_dev(div, p3);
    			append_dev(p3, t10);
    			dispose = listen_dev(div, "click", /*clickBlock*/ ctx[2], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*xp*/ 2 && t0_value !== (t0_value = /*xp*/ ctx[1].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*xp*/ 2 && t2_value !== (t2_value = /*xp*/ ctx[1].start.slice(0, 4) + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*xp*/ 2 && t4_value !== (t4_value = (/*xp*/ ctx[1].end.present
    			? "present"
    			: /*xp*/ ctx[1].end.endDate.slice(0, 4)) + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*xp*/ 2 && t6_value !== (t6_value = /*xp*/ ctx[1].location + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*xp*/ 2 && t8_value !== (t8_value = /*xp*/ ctx[1].employment + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*xp*/ 2 && t10_value !== (t10_value = /*xp*/ ctx[1].desc + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*hoverPointer*/ 1) {
    				toggle_class(div, "block--edit", /*hoverPointer*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let $blockId;
    	validate_store(blockId, "blockId");
    	component_subscribe($$self, blockId, $$value => $$invalidate(3, $blockId = $$value));
    	let { hoverPointer = false } = $$props;
    	let { xp } = $$props;
    	const dispatch = createEventDispatcher();

    	const clickBlock = () => {
    		set_store_value(blockId, $blockId = xp.id);
    		dispatch("clickBlock");
    	};

    	const writable_props = ["hoverPointer", "xp"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ExperienceBlock> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ExperienceBlock", $$slots, []);

    	$$self.$set = $$props => {
    		if ("hoverPointer" in $$props) $$invalidate(0, hoverPointer = $$props.hoverPointer);
    		if ("xp" in $$props) $$invalidate(1, xp = $$props.xp);
    	};

    	$$self.$capture_state = () => ({
    		hoverPointer,
    		xp,
    		blockId,
    		createEventDispatcher,
    		dispatch,
    		clickBlock,
    		$blockId
    	});

    	$$self.$inject_state = $$props => {
    		if ("hoverPointer" in $$props) $$invalidate(0, hoverPointer = $$props.hoverPointer);
    		if ("xp" in $$props) $$invalidate(1, xp = $$props.xp);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hoverPointer, xp, clickBlock];
    }

    class ExperienceBlock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { hoverPointer: 0, xp: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ExperienceBlock",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*xp*/ ctx[1] === undefined && !("xp" in props)) {
    			console.warn("<ExperienceBlock> was created without expected prop 'xp'");
    		}
    	}

    	get hoverPointer() {
    		throw new Error("<ExperienceBlock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hoverPointer(value) {
    		throw new Error("<ExperienceBlock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xp() {
    		throw new Error("<ExperienceBlock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xp(value) {
    		throw new Error("<ExperienceBlock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\AddIcon.svelte generated by Svelte v3.19.2 */
    const file$d = "src\\AddIcon.svelte";

    function create_fragment$f(ctx) {
    	let div;
    	let current;
    	let dispose;

    	const icon = new Icon({
    			props: {
    				data: plus,
    				scale: "2",
    				style: /*rule*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(icon.$$.fragment);
    			attr_dev(div, "class", "i svelte-1t6p8pt");
    			add_location(div, file$d, 21, 0, 403);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(icon, div, null);
    			current = true;
    			dispose = listen_dev(div, "click", /*dispatchClickAdd*/ ctx[0], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const dispatchClickAdd = () => dispatch("clickAdd");

    	const rule = `
    color: steelblue;
    cursor: pointer;"
  `;

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AddIcon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AddIcon", $$slots, []);

    	$$self.$capture_state = () => ({
    		Icon,
    		plus,
    		createEventDispatcher,
    		dispatch,
    		dispatchClickAdd,
    		rule
    	});

    	return [dispatchClickAdd, rule];
    }

    class AddIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AddIcon",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    function objectCopy(obj) {
      if (typeof obj === "object") {
        return JSON.parse(JSON.stringify(obj));
      } else {
        console.log(obj);
      }
    }
    function findObjectInArrayById(list, objectId) {
      return list.find((x) => x.id === objectId);
    }
    function schemaString(objectList) {
      // unused
      let _ = [];
      for (const i in objectList) {
        _.push(i);
      }
      return JSON.stringify(_);
    }

    /* src\ExperienceForm.svelte generated by Svelte v3.19.2 */
    const file$e = "src\\ExperienceForm.svelte";

    // (139:2) {:else}
    function create_else_block(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Delete experience";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Save changes";
    			attr_dev(button0, "class", "btn btn--danger svelte-ugduoz");
    			add_location(button0, file$e, 139, 4, 3229);
    			attr_dev(button1, "class", "btn svelte-ugduoz");
    			add_location(button1, file$e, 142, 4, 3330);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);

    			dispose = [
    				listen_dev(button0, "click", /*clickDelete*/ ctx[6], false, false, false),
    				listen_dev(button1, "click", /*clickSave*/ ctx[5], false, false, false)
    			];
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(139:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (137:2) {#if addNew}
    function create_if_block$2(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Add experience";
    			attr_dev(button, "class", "btn svelte-ugduoz");
    			add_location(button, file$e, 137, 4, 3149);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			dispose = listen_dev(button, "click", /*clickAdd*/ ctx[7], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(137:2) {#if addNew}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let button;
    	let t1;
    	let div5;
    	let label0;
    	let t3;
    	let input0;
    	let input0_placeholder_value;
    	let t4;
    	let label1;
    	let t6;
    	let input1;
    	let input1_placeholder_value;
    	let t7;
    	let label2;
    	let t9;
    	let input2;
    	let input2_placeholder_value;
    	let t10;
    	let div0;
    	let input3;
    	let t11;
    	let label3;
    	let t13;
    	let div4;
    	let div1;
    	let label4;
    	let t15;
    	let input4;
    	let t16;
    	let div2;
    	let label5;
    	let t18;
    	let input5;
    	let t19;
    	let div3;
    	let t20;
    	let label6;
    	let t22;
    	let textarea;
    	let textarea_placeholder_value;
    	let t23;
    	let div6;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*addNew*/ ctx[0]) return create_if_block$2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Cancel";
    			t1 = space();
    			div5 = element("div");
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			label1.textContent = "Location:";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			label2 = element("label");
    			label2.textContent = "Employment type:";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div0 = element("div");
    			input3 = element("input");
    			t11 = space();
    			label3 = element("label");
    			label3.textContent = "I am currently working in this role";
    			t13 = space();
    			div4 = element("div");
    			div1 = element("div");
    			label4 = element("label");
    			label4.textContent = "Start:";
    			t15 = space();
    			input4 = element("input");
    			t16 = space();
    			div2 = element("div");
    			label5 = element("label");
    			label5.textContent = "End:";
    			t18 = space();
    			input5 = element("input");
    			t19 = space();
    			div3 = element("div");
    			t20 = space();
    			label6 = element("label");
    			label6.textContent = "Description:";
    			t22 = space();
    			textarea = element("textarea");
    			t23 = space();
    			div6 = element("div");
    			if_block.c();
    			attr_dev(button, "class", "btn svelte-ugduoz");
    			add_location(button, file$e, 91, 0, 1939);
    			add_location(label0, file$e, 94, 2, 2031);
    			attr_dev(input0, "placeholder", input0_placeholder_value = /*placeholders*/ ctx[4].title);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$e, 95, 2, 2056);
    			add_location(label1, file$e, 99, 2, 2154);
    			attr_dev(input1, "placeholder", input1_placeholder_value = /*placeholders*/ ctx[4].location);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$e, 100, 2, 2182);
    			add_location(label2, file$e, 104, 2, 2286);
    			attr_dev(input2, "placeholder", input2_placeholder_value = /*placeholders*/ ctx[4].employment);
    			attr_dev(input2, "type", "text");
    			add_location(input2, file$e, 105, 2, 2321);
    			attr_dev(input3, "id", "present");
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-ugduoz");
    			add_location(input3, file$e, 110, 4, 2469);
    			attr_dev(label3, "for", "present");
    			attr_dev(label3, "class", "svelte-ugduoz");
    			add_location(label3, file$e, 111, 4, 2540);
    			attr_dev(div0, "class", "current-role--inline svelte-ugduoz");
    			add_location(div0, file$e, 109, 2, 2429);
    			add_location(label4, file$e, 115, 6, 2663);
    			attr_dev(input4, "type", "date");
    			add_location(input4, file$e, 116, 6, 2692);
    			add_location(div1, file$e, 114, 4, 2650);
    			add_location(label5, file$e, 119, 6, 2769);
    			attr_dev(input5, "type", "date");
    			input5.disabled = /*currentRole*/ ctx[2];
    			add_location(input5, file$e, 120, 6, 2796);
    			add_location(div2, file$e, 118, 4, 2756);
    			add_location(div3, file$e, 125, 4, 2916);
    			attr_dev(div4, "class", "fields__term svelte-ugduoz");
    			add_location(div4, file$e, 113, 2, 2618);
    			add_location(label6, file$e, 127, 2, 2937);
    			attr_dev(textarea, "placeholder", textarea_placeholder_value = /*placeholders*/ ctx[4].desc);
    			attr_dev(textarea, "class", "textarea--full-width svelte-ugduoz");
    			attr_dev(textarea, "rows", "4");
    			add_location(textarea, file$e, 128, 2, 2968);
    			attr_dev(div5, "class", "fields");
    			add_location(div5, file$e, 93, 0, 2007);
    			attr_dev(div6, "class", "actions svelte-ugduoz");
    			add_location(div6, file$e, 135, 0, 3106);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, label0);
    			append_dev(div5, t3);
    			append_dev(div5, input0);
    			set_input_value(input0, /*draft*/ ctx[1].title);
    			append_dev(div5, t4);
    			append_dev(div5, label1);
    			append_dev(div5, t6);
    			append_dev(div5, input1);
    			set_input_value(input1, /*draft*/ ctx[1].location);
    			append_dev(div5, t7);
    			append_dev(div5, label2);
    			append_dev(div5, t9);
    			append_dev(div5, input2);
    			set_input_value(input2, /*draft*/ ctx[1].employment);
    			append_dev(div5, t10);
    			append_dev(div5, div0);
    			append_dev(div0, input3);
    			input3.checked = /*currentRole*/ ctx[2];
    			append_dev(div0, t11);
    			append_dev(div0, label3);
    			append_dev(div5, t13);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, label4);
    			append_dev(div1, t15);
    			append_dev(div1, input4);
    			set_input_value(input4, /*draft*/ ctx[1].start);
    			append_dev(div4, t16);
    			append_dev(div4, div2);
    			append_dev(div2, label5);
    			append_dev(div2, t18);
    			append_dev(div2, input5);
    			set_input_value(input5, /*draft*/ ctx[1].end.endDate);
    			append_dev(div4, t19);
    			append_dev(div4, div3);
    			append_dev(div5, t20);
    			append_dev(div5, label6);
    			append_dev(div5, t22);
    			append_dev(div5, textarea);
    			set_input_value(textarea, /*draft*/ ctx[1].desc);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, div6, anchor);
    			if_block.m(div6, null);

    			dispose = [
    				listen_dev(button, "click", /*dispatchCloseForm*/ ctx[3], false, false, false),
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[12]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[13]),
    				listen_dev(input2, "input", /*input2_input_handler*/ ctx[14]),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[15]),
    				listen_dev(input4, "input", /*input4_input_handler*/ ctx[16]),
    				listen_dev(input5, "input", /*input5_input_handler*/ ctx[17]),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[18])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*draft*/ 2 && input0.value !== /*draft*/ ctx[1].title) {
    				set_input_value(input0, /*draft*/ ctx[1].title);
    			}

    			if (dirty & /*draft*/ 2 && input1.value !== /*draft*/ ctx[1].location) {
    				set_input_value(input1, /*draft*/ ctx[1].location);
    			}

    			if (dirty & /*draft*/ 2 && input2.value !== /*draft*/ ctx[1].employment) {
    				set_input_value(input2, /*draft*/ ctx[1].employment);
    			}

    			if (dirty & /*currentRole*/ 4) {
    				input3.checked = /*currentRole*/ ctx[2];
    			}

    			if (dirty & /*draft*/ 2) {
    				set_input_value(input4, /*draft*/ ctx[1].start);
    			}

    			if (dirty & /*currentRole*/ 4) {
    				prop_dev(input5, "disabled", /*currentRole*/ ctx[2]);
    			}

    			if (dirty & /*draft*/ 2) {
    				set_input_value(input5, /*draft*/ ctx[1].end.endDate);
    			}

    			if (dirty & /*draft*/ 2) {
    				set_input_value(textarea, /*draft*/ ctx[1].desc);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div6, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(div6);
    			if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let $xpList;
    	validate_store(xpList, "xpList");
    	component_subscribe($$self, xpList, $$value => $$invalidate(9, $xpList = $$value));
    	let { addNew = false } = $$props;
    	let { blockId = -1 } = $$props;
    	const dispatch = createEventDispatcher();

    	const dispatchCloseForm = () => {
    		dispatch("closeForm");
    	};

    	// form data
    	const placeholders = {
    		title: "Android developer",
    		employment: "Full-time",
    		location: "SF",
    		desc: "Build stuff."
    	};

    	const draftAddNew = {
    		id: 0,
    		title: "",
    		employment: "",
    		location: "",
    		start: "2000-01-01",
    		end: { present: false, endDate: "2000-01-01" },
    		desc: ""
    	};

    	let draft;

    	if (addNew) {
    		draft = draftAddNew;
    	} else {
    		draft = objectCopy(findObjectInArrayById($xpList, blockId));
    	}

    	let currentRole = draft.end.present;

    	// actions
    	const clickSave = () => {
    		$$invalidate(1, draft.end.present = currentRole, draft);
    		const index = $xpList.findIndex(x => x.id === blockId);
    		set_store_value(xpList, $xpList[index] = objectCopy(draft), $xpList);
    		dispatchCloseForm();
    	};

    	const clickDelete = () => {
    		set_store_value(xpList, $xpList = $xpList.filter(x => x.id !== blockId));
    		dispatchCloseForm();
    	};

    	const clickAdd = () => {
    		$$invalidate(1, draft.id = $xpList.length, draft);
    		$$invalidate(1, draft.end.present = currentRole, draft);
    		set_store_value(xpList, $xpList = [...$xpList, draft]);
    		dispatchCloseForm();
    	};

    	const writable_props = ["addNew", "blockId"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ExperienceForm> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ExperienceForm", $$slots, []);

    	function input0_input_handler() {
    		draft.title = this.value;
    		$$invalidate(1, draft);
    	}

    	function input1_input_handler() {
    		draft.location = this.value;
    		$$invalidate(1, draft);
    	}

    	function input2_input_handler() {
    		draft.employment = this.value;
    		$$invalidate(1, draft);
    	}

    	function input3_change_handler() {
    		currentRole = this.checked;
    		$$invalidate(2, currentRole);
    	}

    	function input4_input_handler() {
    		draft.start = this.value;
    		$$invalidate(1, draft);
    	}

    	function input5_input_handler() {
    		draft.end.endDate = this.value;
    		$$invalidate(1, draft);
    	}

    	function textarea_input_handler() {
    		draft.desc = this.value;
    		$$invalidate(1, draft);
    	}

    	$$self.$set = $$props => {
    		if ("addNew" in $$props) $$invalidate(0, addNew = $$props.addNew);
    		if ("blockId" in $$props) $$invalidate(8, blockId = $$props.blockId);
    	};

    	$$self.$capture_state = () => ({
    		addNew,
    		blockId,
    		xpList,
    		objectCopy,
    		findObjectInArrayById,
    		schemaString,
    		createEventDispatcher,
    		dispatch,
    		dispatchCloseForm,
    		placeholders,
    		draftAddNew,
    		draft,
    		currentRole,
    		clickSave,
    		clickDelete,
    		clickAdd,
    		$xpList
    	});

    	$$self.$inject_state = $$props => {
    		if ("addNew" in $$props) $$invalidate(0, addNew = $$props.addNew);
    		if ("blockId" in $$props) $$invalidate(8, blockId = $$props.blockId);
    		if ("draft" in $$props) $$invalidate(1, draft = $$props.draft);
    		if ("currentRole" in $$props) $$invalidate(2, currentRole = $$props.currentRole);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		addNew,
    		draft,
    		currentRole,
    		dispatchCloseForm,
    		placeholders,
    		clickSave,
    		clickDelete,
    		clickAdd,
    		blockId,
    		$xpList,
    		dispatch,
    		draftAddNew,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_change_handler,
    		input4_input_handler,
    		input5_input_handler,
    		textarea_input_handler
    	];
    }

    class ExperienceForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { addNew: 0, blockId: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ExperienceForm",
    			options,
    			id: create_fragment$g.name
    		});
    	}

    	get addNew() {
    		throw new Error("<ExperienceForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addNew(value) {
    		throw new Error("<ExperienceForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blockId() {
    		throw new Error("<ExperienceForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blockId(value) {
    		throw new Error("<ExperienceForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Experience.svelte generated by Svelte v3.19.2 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (31:2) {#each $xpList as xp}
    function create_each_block_1$1(ctx) {
    	let current;

    	const experienceblock = new ExperienceBlock({
    			props: { xp: /*xp*/ ctx[11] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(experienceblock.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(experienceblock, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const experienceblock_changes = {};
    			if (dirty & /*$xpList*/ 8) experienceblock_changes.xp = /*xp*/ ctx[11];
    			experienceblock.$set(experienceblock_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(experienceblock.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(experienceblock.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(experienceblock, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(31:2) {#each $xpList as xp}",
    		ctx
    	});

    	return block;
    }

    // (30:0) <SectionCard section="Experience" on:clickEdit={clickEdit}>
    function create_default_slot_2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*$xpList*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$xpList*/ 8) {
    				each_value_1 = /*$xpList*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(30:0) <SectionCard section=\\\"Experience\\\" on:clickEdit={clickEdit}>",
    		ctx
    	});

    	return block;
    }

    // (38:2) {#each $xpList as xp}
    function create_each_block$1(ctx) {
    	let current;

    	const experienceblock = new ExperienceBlock({
    			props: { xp: /*xp*/ ctx[11], hoverPointer: true },
    			$$inline: true
    		});

    	experienceblock.$on("clickBlock", /*clickBlock*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(experienceblock.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(experienceblock, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const experienceblock_changes = {};
    			if (dirty & /*$xpList*/ 8) experienceblock_changes.xp = /*xp*/ ctx[11];
    			experienceblock.$set(experienceblock_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(experienceblock.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(experienceblock.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(experienceblock, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(38:2) {#each $xpList as xp}",
    		ctx
    	});

    	return block;
    }

    // (37:0) <Modal bind:display={showMdl}>
    function create_default_slot_1$1(ctx) {
    	let t;
    	let current;
    	let each_value = /*$xpList*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const addicon = new AddIcon({ $$inline: true });
    	addicon.$on("clickAdd", /*clickAdd*/ ctx[7]);

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			create_component(addicon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t, anchor);
    			mount_component(addicon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$xpList, clickBlock*/ 264) {
    				each_value = /*$xpList*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(addicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(addicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(addicon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(37:0) <Modal bind:display={showMdl}>",
    		ctx
    	});

    	return block;
    }

    // (45:0) <Modal bind:display={showMdlMdl}>
    function create_default_slot$4(ctx) {
    	let current;

    	const experienceform = new ExperienceForm({
    			props: {
    				addNew: /*addNew*/ ctx[2],
    				blockId: /*$blockId*/ ctx[4]
    			},
    			$$inline: true
    		});

    	experienceform.$on("closeForm", /*closeMdlMdl*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(experienceform.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(experienceform, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const experienceform_changes = {};
    			if (dirty & /*addNew*/ 4) experienceform_changes.addNew = /*addNew*/ ctx[2];
    			if (dirty & /*$blockId*/ 16) experienceform_changes.blockId = /*$blockId*/ ctx[4];
    			experienceform.$set(experienceform_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(experienceform.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(experienceform.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(experienceform, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(45:0) <Modal bind:display={showMdlMdl}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
    	let t0;
    	let updating_display;
    	let t1;
    	let updating_display_1;
    	let current;

    	const sectioncard = new SectionCard({
    			props: {
    				section: "Experience",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	sectioncard.$on("clickEdit", /*clickEdit*/ ctx[5]);

    	function modal0_display_binding(value) {
    		/*modal0_display_binding*/ ctx[9].call(null, value);
    	}

    	let modal0_props = {
    		$$slots: { default: [create_default_slot_1$1] },
    		$$scope: { ctx }
    	};

    	if (/*showMdl*/ ctx[0] !== void 0) {
    		modal0_props.display = /*showMdl*/ ctx[0];
    	}

    	const modal0 = new Modal({ props: modal0_props, $$inline: true });
    	binding_callbacks.push(() => bind(modal0, "display", modal0_display_binding));

    	function modal1_display_binding(value) {
    		/*modal1_display_binding*/ ctx[10].call(null, value);
    	}

    	let modal1_props = {
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	};

    	if (/*showMdlMdl*/ ctx[1] !== void 0) {
    		modal1_props.display = /*showMdlMdl*/ ctx[1];
    	}

    	const modal1 = new Modal({ props: modal1_props, $$inline: true });
    	binding_callbacks.push(() => bind(modal1, "display", modal1_display_binding));

    	const block = {
    		c: function create() {
    			create_component(sectioncard.$$.fragment);
    			t0 = space();
    			create_component(modal0.$$.fragment);
    			t1 = space();
    			create_component(modal1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(sectioncard, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modal0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(modal1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const sectioncard_changes = {};

    			if (dirty & /*$$scope, $xpList*/ 65544) {
    				sectioncard_changes.$$scope = { dirty, ctx };
    			}

    			sectioncard.$set(sectioncard_changes);
    			const modal0_changes = {};

    			if (dirty & /*$$scope, $xpList*/ 65544) {
    				modal0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_display && dirty & /*showMdl*/ 1) {
    				updating_display = true;
    				modal0_changes.display = /*showMdl*/ ctx[0];
    				add_flush_callback(() => updating_display = false);
    			}

    			modal0.$set(modal0_changes);
    			const modal1_changes = {};

    			if (dirty & /*$$scope, addNew, $blockId*/ 65556) {
    				modal1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_display_1 && dirty & /*showMdlMdl*/ 2) {
    				updating_display_1 = true;
    				modal1_changes.display = /*showMdlMdl*/ ctx[1];
    				add_flush_callback(() => updating_display_1 = false);
    			}

    			modal1.$set(modal1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sectioncard.$$.fragment, local);
    			transition_in(modal0.$$.fragment, local);
    			transition_in(modal1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sectioncard.$$.fragment, local);
    			transition_out(modal0.$$.fragment, local);
    			transition_out(modal1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sectioncard, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modal0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(modal1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let $xpList;
    	let $blockId;
    	validate_store(xpList, "xpList");
    	component_subscribe($$self, xpList, $$value => $$invalidate(3, $xpList = $$value));
    	validate_store(blockId, "blockId");
    	component_subscribe($$self, blockId, $$value => $$invalidate(4, $blockId = $$value));
    	let showMdl = false;
    	let showMdlMdl = false;
    	let addNew = false;

    	const clickEdit = () => {
    		$$invalidate(0, showMdl = true);
    	};

    	const closeMdlMdl = () => {
    		$$invalidate(1, showMdlMdl = false);
    	};

    	const clickAdd = () => {
    		$$invalidate(2, addNew = true);
    		$$invalidate(1, showMdlMdl = true);
    	};

    	const clickBlock = () => {
    		$$invalidate(2, addNew = false);
    		$$invalidate(1, showMdlMdl = true);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Experience> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Experience", $$slots, []);

    	function modal0_display_binding(value) {
    		showMdl = value;
    		$$invalidate(0, showMdl);
    	}

    	function modal1_display_binding(value) {
    		showMdlMdl = value;
    		$$invalidate(1, showMdlMdl);
    	}

    	$$self.$capture_state = () => ({
    		Modal,
    		SectionCard,
    		ExperienceBlock,
    		AddIcon,
    		ExperienceForm,
    		xpList,
    		blockId,
    		showMdl,
    		showMdlMdl,
    		addNew,
    		clickEdit,
    		closeMdlMdl,
    		clickAdd,
    		clickBlock,
    		$xpList,
    		$blockId
    	});

    	$$self.$inject_state = $$props => {
    		if ("showMdl" in $$props) $$invalidate(0, showMdl = $$props.showMdl);
    		if ("showMdlMdl" in $$props) $$invalidate(1, showMdlMdl = $$props.showMdlMdl);
    		if ("addNew" in $$props) $$invalidate(2, addNew = $$props.addNew);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showMdl,
    		showMdlMdl,
    		addNew,
    		$xpList,
    		$blockId,
    		clickEdit,
    		closeMdlMdl,
    		clickAdd,
    		clickBlock,
    		modal0_display_binding,
    		modal1_display_binding
    	];
    }

    class Experience extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Experience",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.19.2 */
    const file$f = "src\\App.svelte";

    function create_fragment$i(ctx) {
    	let t0;
    	let div;
    	let t1;
    	let current;
    	const topbar = new TopBar({ $$inline: true });
    	const about = new About({ $$inline: true });
    	const experience = new Experience({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(topbar.$$.fragment);
    			t0 = space();
    			div = element("div");
    			create_component(about.$$.fragment);
    			t1 = space();
    			create_component(experience.$$.fragment);
    			attr_dev(div, "id", "app");
    			attr_dev(div, "class", "svelte-1xhdrut");
    			add_location(div, file$f, 13, 0, 204);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(topbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(about, div, null);
    			append_dev(div, t1);
    			mount_component(experience, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(topbar.$$.fragment, local);
    			transition_in(about.$$.fragment, local);
    			transition_in(experience.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(topbar.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			transition_out(experience.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(topbar, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			destroy_component(about);
    			destroy_component(experience);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ TopBar, About, Experience });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
