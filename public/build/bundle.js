
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    // (108:1) {#if finish}
    function create_if_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Reset";
    			attr_dev(button, "class", "svelte-689p98");
    			add_location(button, file, 108, 2, 2666);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*resetGame*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(108:1) {#if finish}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let table;
    	let tr0;
    	let button0;
    	let t2_value = /*fields*/ ctx[2][0][0] + "";
    	let t2;
    	let t3;
    	let button1;
    	let t4_value = /*fields*/ ctx[2][0][1] + "";
    	let t4;
    	let t5;
    	let button2;
    	let t6_value = /*fields*/ ctx[2][0][2] + "";
    	let t6;
    	let t7;
    	let tr1;
    	let button3;
    	let t8_value = /*fields*/ ctx[2][1][0] + "";
    	let t8;
    	let t9;
    	let button4;
    	let t10_value = /*fields*/ ctx[2][1][1] + "";
    	let t10;
    	let t11;
    	let button5;
    	let t12_value = /*fields*/ ctx[2][1][2] + "";
    	let t12;
    	let t13;
    	let tr2;
    	let button6;
    	let t14_value = /*fields*/ ctx[2][2][0] + "";
    	let t14;
    	let t15;
    	let button7;
    	let t16_value = /*fields*/ ctx[2][2][1] + "";
    	let t16;
    	let t17;
    	let button8;
    	let t18_value = /*fields*/ ctx[2][2][2] + "";
    	let t18;
    	let t19;
    	let h2;
    	let t20;
    	let t21;
    	let mounted;
    	let dispose;
    	let if_block = /*finish*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Velmi cool piškvorky";
    			t1 = space();
    			table = element("table");
    			tr0 = element("tr");
    			button0 = element("button");
    			t2 = text(t2_value);
    			t3 = space();
    			button1 = element("button");
    			t4 = text(t4_value);
    			t5 = space();
    			button2 = element("button");
    			t6 = text(t6_value);
    			t7 = space();
    			tr1 = element("tr");
    			button3 = element("button");
    			t8 = text(t8_value);
    			t9 = space();
    			button4 = element("button");
    			t10 = text(t10_value);
    			t11 = space();
    			button5 = element("button");
    			t12 = text(t12_value);
    			t13 = space();
    			tr2 = element("tr");
    			button6 = element("button");
    			t14 = text(t14_value);
    			t15 = space();
    			button7 = element("button");
    			t16 = text(t16_value);
    			t17 = space();
    			button8 = element("button");
    			t18 = text(t18_value);
    			t19 = space();
    			h2 = element("h2");
    			t20 = text(/*ending*/ ctx[0]);
    			t21 = space();
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "svelte-689p98");
    			add_location(h1, file, 94, 1, 1910);
    			attr_dev(button0, "class", "0,0 svelte-689p98");
    			add_location(button0, file, 97, 3, 1962);
    			attr_dev(button1, "class", "0,1 svelte-689p98");
    			add_location(button1, file, 97, 71, 2030);
    			attr_dev(button2, "class", "0,2 svelte-689p98");
    			add_location(button2, file, 97, 138, 2097);
    			add_location(tr0, file, 96, 2, 1953);
    			attr_dev(button3, "class", "1,0 svelte-689p98");
    			add_location(button3, file, 100, 3, 2185);
    			attr_dev(button4, "class", "1,1 svelte-689p98");
    			add_location(button4, file, 100, 70, 2252);
    			attr_dev(button5, "class", "1,2 svelte-689p98");
    			add_location(button5, file, 100, 137, 2319);
    			add_location(tr1, file, 99, 2, 2176);
    			attr_dev(button6, "class", "2,0 svelte-689p98");
    			add_location(button6, file, 103, 3, 2407);
    			attr_dev(button7, "class", "2,1 svelte-689p98");
    			add_location(button7, file, 103, 70, 2474);
    			attr_dev(button8, "class", "2,2 svelte-689p98");
    			add_location(button8, file, 103, 137, 2541);
    			add_location(tr2, file, 102, 2, 2398);
    			attr_dev(table, "class", "svelte-689p98");
    			add_location(table, file, 95, 1, 1942);
    			attr_dev(h2, "class", "svelte-689p98");
    			add_location(h2, file, 106, 1, 2630);
    			add_location(main, file, 93, 0, 1901);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, table);
    			append_dev(table, tr0);
    			append_dev(tr0, button0);
    			append_dev(button0, t2);
    			append_dev(tr0, t3);
    			append_dev(tr0, button1);
    			append_dev(button1, t4);
    			append_dev(tr0, t5);
    			append_dev(tr0, button2);
    			append_dev(button2, t6);
    			append_dev(table, t7);
    			append_dev(table, tr1);
    			append_dev(tr1, button3);
    			append_dev(button3, t8);
    			append_dev(tr1, t9);
    			append_dev(tr1, button4);
    			append_dev(button4, t10);
    			append_dev(tr1, t11);
    			append_dev(tr1, button5);
    			append_dev(button5, t12);
    			append_dev(table, t13);
    			append_dev(table, tr2);
    			append_dev(tr2, button6);
    			append_dev(button6, t14);
    			append_dev(tr2, t15);
    			append_dev(tr2, button7);
    			append_dev(button7, t16);
    			append_dev(tr2, t17);
    			append_dev(tr2, button8);
    			append_dev(button8, t18);
    			append_dev(main, t19);
    			append_dev(main, h2);
    			append_dev(h2, t20);
    			append_dev(main, t21);
    			if (if_block) if_block.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button1, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button2, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button3, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button4, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button5, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button6, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button7, "click", /*changeField*/ ctx[3], false, false, false, false),
    					listen_dev(button8, "click", /*changeField*/ ctx[3], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fields*/ 4 && t2_value !== (t2_value = /*fields*/ ctx[2][0][0] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*fields*/ 4 && t4_value !== (t4_value = /*fields*/ ctx[2][0][1] + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*fields*/ 4 && t6_value !== (t6_value = /*fields*/ ctx[2][0][2] + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*fields*/ 4 && t8_value !== (t8_value = /*fields*/ ctx[2][1][0] + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*fields*/ 4 && t10_value !== (t10_value = /*fields*/ ctx[2][1][1] + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*fields*/ 4 && t12_value !== (t12_value = /*fields*/ ctx[2][1][2] + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*fields*/ 4 && t14_value !== (t14_value = /*fields*/ ctx[2][2][0] + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*fields*/ 4 && t16_value !== (t16_value = /*fields*/ ctx[2][2][1] + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*fields*/ 4 && t18_value !== (t18_value = /*fields*/ ctx[2][2][2] + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*ending*/ 1) set_data_dev(t20, /*ending*/ ctx[0]);

    			if (/*finish*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let crossTurn = true;
    	let ending = "";
    	let finish = false;
    	let fields = [["", "", ""].slice(), ["", "", ""].slice(), ["", "", ""].slice()];

    	function changeField(e) {
    		if (finish) return;
    		let position = e.target.getAttribute("class").split(" ")[0].split(",");
    		const x = parseInt(position[0]);
    		const y = parseInt(position[1]);
    		console.log(x, y);
    		if (fields[x][y] != "") return;
    		if (crossTurn) $$invalidate(2, fields[x][y] = "X", fields); else $$invalidate(2, fields[x][y] = "O", fields);
    		crossTurn = !crossTurn;
    		checkWinner();
    	}

    	function checkWinner() {
    		// horizontal
    		for (let i = 0; i < 3; i++) {
    			if (fields[i][0] !== "" && fields[i][0] === fields[i][1] && fields[i][1] === fields[i][2]) {
    				announceWinner(fields[i][0]);
    				return;
    			}
    		}

    		// vertical
    		for (let j = 0; j < 3; j++) {
    			if (fields[0][j] !== "" && fields[0][j] === fields[1][j] && fields[1][j] === fields[2][j]) {
    				announceWinner(fields[0][j]);
    				return;
    			}
    		}

    		//diagonal
    		if (fields[0][0] !== "" && fields[0][0] === fields[1][1] && fields[1][1] === fields[2][2]) {
    			announceWinner(fields[0][0]);
    			return;
    		}

    		//diagonal
    		if (fields[0][2] !== "" && fields[0][2] === fields[1][1] && fields[1][1] === fields[2][0]) {
    			announceWinner(fields[0][2]);
    			return;
    		}

    		let draw = true;

    		for (let row of fields) {
    			for (let cell of row) {
    				if (cell === "") {
    					draw = false;
    					break;
    				}
    			}

    			if (!draw) break;
    		}

    		if (draw) {
    			console.log("Draw");
    			$$invalidate(1, finish = true);
    		}
    	}

    	function announceWinner(winner) {
    		console.log(winner);
    		$$invalidate(0, ending = "Winner is " + winner);
    		$$invalidate(1, finish = true);
    	}

    	function resetGame() {
    		$$invalidate(1, finish = false);
    		$$invalidate(0, ending = "");
    		for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) $$invalidate(2, fields[i][j] = "", fields);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		crossTurn,
    		ending,
    		finish,
    		fields,
    		changeField,
    		checkWinner,
    		announceWinner,
    		resetGame
    	});

    	$$self.$inject_state = $$props => {
    		if ('crossTurn' in $$props) crossTurn = $$props.crossTurn;
    		if ('ending' in $$props) $$invalidate(0, ending = $$props.ending);
    		if ('finish' in $$props) $$invalidate(1, finish = $$props.finish);
    		if ('fields' in $$props) $$invalidate(2, fields = $$props.fields);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ending, finish, fields, changeField, resetGame];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
