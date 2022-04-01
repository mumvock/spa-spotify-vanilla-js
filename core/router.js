export class Router {
    _routes;
    _previousRoute;
    _componentController;

    get routes() {
        return this._routes;
    }

    get previousRoute() {
        return this._previousRoute;
    }

    currentPath = () => window.location.pathname;

    constructor(routes) {
        this._routes = routes;
        this.navigate('/');

        // (function(history){
        //     var pushState = history.pushState;
        //     history.pushState = function(state) {
        //         if (typeof history.onpushstate == "function") {
        //             history.onpushstate({state: state});
        //         }
        //         // ... whatever else you want to do
        //         // maybe call onhashchange e.handler
        //         return pushState.apply(history, arguments);
        //     };
        // })(window.history);

        return {
            listenNavigate: (element, path, data) =>
                this.listenNavigate(element, path, data),
            currentPath: this.currentPath,
            navigate: (path) => this.navigate(path),
            previousRoute: this.previousRoute,
            routes: this.routes,
        };
    }

    listenNavigate(element, path, data) {
        element.addEventListener(
            'click',
            () => this.navigate(path, data),
            false
        );
    }

    navigate(path, data) {
        let route = this.routes.filter((route) => route.path === path)[0];

        if (!route) {
            return;
        }

        this._previousRoute = this.currentPath();
        // window.history.pushState({}, '', route.path);

        this._componentController = new ComponentController();
        this._componentController.changeComponent(route, data);

        document.title = document.title.split(' - ')[0] + ' - ' + route.name;
    }
}

export class ComponentController {
    _component = {
        onDestroy: null,
        selector: null,
    };

    constructor() {
        return {
            changeComponent: (route, data) => this.changeComponent(route, data),
        };
    }

    changeComponent(route, data) {
        this._destroyComponent();
        this._appendComponent(route, data);
    }

    _destroyComponent() {
        if (this._component.onDestroy && this._component.selector) {
            this._component.onDestroy();
            const componentElement = document.body.querySelector(
                this._component.selector
            );
            document.body.removeChild(componentElement);
        }
    }

    async _appendComponent(route, data) {
        const { ComponentController } = await route.loadChildren();

        const componentElement = document.createElement(
            (this._component.selector = `spa-${route.name.toLowerCase()}-component`)
        );

        const elementsController = new ElementsController(componentElement);
        const componentInstance = new ComponentController(
            elementsController,
            data
        );

        this._component.onDestroy = componentInstance.onDestroy;
        
        componentElement.insertAdjacentHTML(
            'beforeend',
            componentInstance.template()
        );
        
        elementsController._onInit(componentInstance);

        document.body.appendChild(componentElement);
        componentInstance.onInit && componentInstance.onInit();
    }
}

export const router = new Router([
    {
        path: '/',
        name: 'Search',
        loadChildren: () =>
            import('../components/search.component.js').then((m) => m),
    },
    {
        path: '/details',
        name: 'Details',
        loadChildren: () =>
            import('../components/details.component.js').then((m) => m),
    },
]);

export class ElementsController {
    _componentElementRef;
    _componentInstance;

    constructor(componentElement) {
        this._componentElementRef = componentElement;

        // Exported properties
        return {
            _onInit: this._onInit,
            componentElementRef: this._componentElementRef,
            refresh: (spaAttributeValue) => this.refresh(spaAttributeValue),
            listSpaElements: () => this.listSpaElements(),
            getSpaElement: (spaElementTarget) =>
                this.getSpaElement(spaElementTarget),
        };
    }

    _onInit = (componentInstance) => {
        this._componentInstance = componentInstance;
        this._checkSpaAttributesValue();
        this._processSpaIfAttributes(this._componentElementRef);
        this._processSpaForAttributes(this._componentElementRef);
    };

    /**
     * Busca elementos com atributos `spa` e checam se seu valor está correto
     * @returns `NodeList` lista de elementos dinâmicos
     */
    _checkSpaAttributesValue() {
        const nodeList = this._componentElementRef.querySelectorAll('[spa]');
        Array.from(nodeList).reduce((attributeValues, element) => {
            const currentAttributeValue = element.getAttribute('spa');

            if (!currentAttributeValue) {
                throw new Error('"spa" attribute needs a value',  { cause: element });
            }

            const spaValueAlreadyUsed = attributeValues.find(
                (attributeValue) => attributeValue === currentAttributeValue
            );

            if (spaValueAlreadyUsed) {
                throw new Error('"spa" attribute needs to be unique',  { cause: element });
            }

            return [...attributeValues, currentAttributeValue];
        }, []);
    }

    /** Remove do DOM todos os elementos com expressão `spa-if` resultante em `false` */
    _processSpaIfAttributes(template, parent = []) {
        template.querySelectorAll('[spa-if]').forEach((element) => {
            const spaIfChildOfSpaFor = element.parentNode.closest('[spa-for]');

            if (spaIfChildOfSpaFor) {
                return;
            }

            const unparsedExpression = element.getAttribute('spa-if');
            let expression = unparsedExpression;

            if (parent.length) {
                parent.forEach((p, i) => expression = expression.replaceAll(new RegExp('\\b' + p.name + '\\b', 'g'), `arguments[${i}]`));
                expression = new Function('try { return ' + expression + ' } catch { return false }').apply(this._componentInstance, parent.map((p) => p.value));
            } else {
                expression = new Function('try { return ' + expression + ' } catch { return "abort-spa-if" }').apply(this._componentInstance, []);
            }

            if (expression === 'abort-spa-if') {
                return;
            }

            if (!expression) {
                element.parentNode.removeChild(element);
            } else {
                element.removeAttribute('spa-if');
            }
        });
    }

    _processSpaForAttributes(template, parent = []) {
        template.querySelectorAll(':scope > *[spa-for]').forEach((element) => {
            const attributeValue = element.getAttribute('spa-for') || '';
            
            if (!(/^[^\s]+\sof\s[^\s]+/.test(attributeValue))) {
                throw new Error('"spa-for" attribute value needs to be in this format: spa-for="currentValue of array"',  { cause: element });
            }

            const attributeValueSplited = attributeValue.split(' of ');
            const valueName = attributeValueSplited[0].trim();
            let arrayName = attributeValueSplited[1].trim();

            const getForArray = () => {
                if (parent.length) {
                    parent.forEach((p, i) => arrayName = arrayName.replaceAll(new RegExp('\\b' + p.name + '\\b', 'g'), `arguments[${i}]`));
                    return new Function('return ' + arrayName).apply(this._componentInstance, parent.map((p) => p.value));
                } else {
                    return new Function('return ' + arrayName).apply(this._componentInstance, []);
                }
            };

            const forArray = Array.isArray(getForArray()) ? getForArray() : getForArray()();

            if (!Array.isArray(forArray)) {
                throw new Error('"spa-for" attribute value needs to be in this format: spa-for="currentValue of array"',  { cause: element });
            }

            forArray.reduce((previousElement, value) => {
                const newElement = element.cloneNode(true);
                newElement.removeAttribute('spa-for');

                this._processSpaIfAttributes(newElement, [
                    ...parent,
                    {
                        value,
                        name: valueName,
                    }
                ]);

                if (newElement.querySelector(':scope > *[spa-for]')) {
                    this._processSpaForAttributes(
                        newElement,
                        [
                            ...parent,
                            {
                                value,
                                name: valueName,
                            }
                        ]
                    );
                }

                const replaceInterpulations = (interpulations, target) => {
                    if (Array.isArray(interpulations) && interpulations.length) {
                        interpulations.forEach((interpulation) => {
                            let stringToReplace = interpulation
                                .match(/\{\{([^}]+)\}}/)
                                .pop()
                                .trim();

                            stringToReplace = stringToReplace.replaceAll(/&#x([a-fA-F0-9]+);/g, (m, g) => String.fromCharCode(parseInt(g, 16)));
                            stringToReplace = stringToReplace.replaceAll('&gt;', '>');
                            stringToReplace = stringToReplace.replaceAll('&lt;', '<');
                            
                            stringToReplace = stringToReplace.replaceAll(new RegExp('\\b' + valueName + '\\b', 'g'), 'arguments[0]');
                            parent.forEach((p, i) => stringToReplace = stringToReplace.replaceAll(new RegExp('\\b' + p.name + '\\b', 'g'), `arguments[${i}]`));
                            const replacedString = new Function('return ' + stringToReplace).apply(this._componentInstance, [value, ...parent.map((p) => p.value)]);
                    
                            if (target === 'innerHTML') {
                                newElement.innerHTML =
                                    newElement.innerHTML.replace(
                                        interpulation,
                                        replacedString
                                    );
                            } else {
                                const attrValue = newElement.getAttribute(target);
                                newElement.setAttribute(target, attrValue.replace(
                                    interpulation,
                                    replacedString
                                ));
                            }
                        });
                    }
                };

                const getInterpulations = (str) => str.match(/\{\{([^}]+)\}}/g);
                
                const innerHTMLInterpulations = getInterpulations(newElement.innerHTML);
                replaceInterpulations(innerHTMLInterpulations, 'innerHTML');

                Array.from(
                    newElement.attributes
                ).forEach((attr) => {
                    const hasInterpulations = getInterpulations(attr.nodeValue);

                    if (hasInterpulations) {
                        replaceInterpulations(hasInterpulations, attr.nodeName);
                    }
                });

                previousElement.insertAdjacentElement(
                    'afterend',
                    newElement
                );

                return newElement;
            }, element);

            template.removeChild(element);
        });
    }

    _updatedComponentElement = () => {
        const tempComponentElementRef = document.createElement('temp');
        tempComponentElementRef.insertAdjacentHTML(
            'beforeend',
            this._componentInstance.template()
        );

        return tempComponentElementRef;
    };

    refresh(spaAttributeValue) {
        const domElementTarget = this._componentElementRef.querySelector(
            `[spa="${spaAttributeValue}"]`
        );

        if (domElementTarget) {
            this._componentElementRef.removeChild(domElementTarget);
        }

        const tempComponentElementRef = this._updatedComponentElement();
        this._processSpaIfAttributes(tempComponentElementRef);

        const refreshedTarget = tempComponentElementRef.querySelector(
            `[spa="${spaAttributeValue}"]`
        );

        if (refreshedTarget) {
            this._processSpaForAttributes(refreshedTarget);
            Array.from(this._componentElementRef.children).forEach((child) => {
                if (child.isEqualNode(refreshedTarget.previousElementSibling)) {
                    child.insertAdjacentElement('afterend', refreshedTarget);
                }
            });
        }
    }

    listSpaElements() {
        return {
            currentlyInDOM: Array.from(
                this._componentElementRef.querySelectorAll('[spa]')
            ).map((spaElement) => spaElement.getAttribute('spa')),

            all: Array.from(
                this._updatedComponentElement().querySelectorAll('[spa]')
            ).map((spaElement) => spaElement.getAttribute('spa')),
        };
    }

    getSpaElement(spaElementTarget) {
        return this._componentElementRef.querySelector(
            `[spa="${spaElementTarget}"]`
        );
    }
}
