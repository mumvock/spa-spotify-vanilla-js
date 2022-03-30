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
     * Busca e retorna elementos com atributo `spa` com valor
     * @returns `NodeList` lista de elementos dinâmicos
     */
    _checkSpaAttributesValue() {
        const nodeList = this._componentElementRef.querySelectorAll('[spa]');
        Array.from(nodeList).reduce((attributeValues, element) => {
            const currentAttributeValue = element.getAttribute('spa');

            if (!currentAttributeValue) {
                console.error(
                    'SPA ERROR: "spa" attribute needs a value. Problematic element:',
                    element
                );
            }

            const spaValueAlreadyUsed = attributeValues.find(
                (attributeValue) => attributeValue === currentAttributeValue
            );

            if (spaValueAlreadyUsed) {
                console.error(
                    'SPA ERROR: "spa" attribute needs to be unique. Problematic element:',
                    element
                );

                return;
            }

            return [...attributeValues, currentAttributeValue];
        }, []);
    }

    /** Remove do DOM todos os elementos com expressão `spa-if` resultante em `false` */
    _processSpaIfAttributes(template, interpretString) {
        template.querySelectorAll('[spa-if]').forEach((element) => {
            const unparsedExpression = element.getAttribute('spa-if');
            const hasInterpulation = unparsedExpression.match(/{{(.*)}}/);

            if (hasInterpulation && !interpretString) {
                return;
            }

            let expression = !(
                unparsedExpression === 'undefined' ||
                unparsedExpression === 'false' ||
                unparsedExpression === 'null' ||
                unparsedExpression === '0'
            );
            
            if (interpretString) {
                expression = new Function('return ' + unparsedExpression)();
            }

            if (!expression) {
                element.parentNode.removeChild(element);
            } else {
                element.removeAttribute('spa-if');
            }
        });
    }

    _processSpaForAttributes(template, parentArrayItemName, parentItem) {
        template.querySelectorAll('[spa-for]').forEach((element) => {
            const getAttributeValue = (target) => {
                const value = target.getAttribute('spa-for');

                if (value.indexOf(' of ') === -1) {
                    console.error(
                        'SPA ERROR: "spa-for" attribute value needs to be in this format: spa-for="itemName of Array". Problematic element:',
                        target
                    );
                }

                return value;
            };

            const attributeValue = getAttributeValue(element);
            const spaForChildOfSpaFor = element.parentNode.closest('[spa-for]');

            if (spaForChildOfSpaFor) {
                return;
            }

            const attributeValueSplited = attributeValue.split(' of ');
            const arrayItemName = attributeValueSplited[0].trim();
            let arrayName = attributeValueSplited[1].trim();

            const getForArray = () => {
                arrayName = arrayName.replaceAll(new RegExp('\\b' + parentArrayItemName + '\\b', 'g'), 'arguments[0]');
                return new Function('return ' + arrayName).apply(this._componentInstance, [parentItem]);
            };

            const forArray = Array.isArray(getForArray()) ? getForArray() : getForArray()();

            if (Array.isArray(forArray)) {
                forArray.reduce((previousElement, item) => {
                    const newElement = element.cloneNode(true);
                    newElement.removeAttribute('spa-for');

                    if (
                        Array.from(newElement.querySelectorAll('[spa-for]'))[0]
                    ) {
                        this._processSpaForAttributes(
                            newElement,
                            arrayItemName,
                            item
                        );
                    }

                    const replaceInterpulations = (interpulations, target) => {
                        if (Array.isArray(interpulations) && interpulations.length) {
                            interpulations.forEach((interpulation) => {
                                let stringToReplace = interpulation
                                    .match(/{{(.*)}}/)
                                    .pop()
                                    .trim();

                                stringToReplace = stringToReplace.replaceAll(new RegExp('\\b' + arrayItemName + '\\b', 'g'), 'arguments[0]');
                                stringToReplace = stringToReplace.replaceAll(new RegExp('\\b' + parentArrayItemName + '\\b', 'g'), 'arguments[1]');

                                const replacedString = new Function('return ' + stringToReplace).apply(this._componentInstance, [item, parentItem]);
                     
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

                    const getInterpulations = (str) => str.match(/{{(.*)}}/g);
                    
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
            }

            template.removeChild(element);
        });

        this._processSpaIfAttributes(template, true);
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
