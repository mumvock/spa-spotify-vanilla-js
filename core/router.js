export class Router {
    _routes;
    _previousRoute;
    _currentComponent;
    _currentComponentElement;

    get routes() {
        return this._routes;
    }

    set routes(routes) {
        this._routes = routes;
    }

    get previousRoute() {
        return this._previousRoute;
    }

    set previousRoute(previousRoute) {
        this._previousRoute = previousRoute;
    }

    currentPath = () => window.location.pathname;

    constructor(routes) {
        this.routes = routes;
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
            listenNavigate: (element, path) => this.listenNavigate(element, path),
            currentPath: this.currentPath,
            navigate: (path) => this.navigate(path),
            previousRoute: this.previousRoute,
            routes,
        };
    }

    listenNavigate(element, path) {
        element.addEventListener('click', () => this.navigate(path), false)
    }

    navigate(path) {
        let route = this.routes.filter((route) => route.path === path)[0];

        if (!route) {
            route = this.routes.filter((route) => route.path === '/')[0];
            
            return;
        }

        this.destroyComponent();
        this.appendComponent(route);
    }

    async appendComponent(route) {
        this.previousRoute = this.currentPath();
        window.history.pushState({}, '', route.path);
        
        const { ComponentController, ElementsController, componentSettings } = await route.loadChildren();

        this._currentComponentElement = document.createElement(componentSettings.selector);
        this._currentComponentElement.insertAdjacentHTML(
            "beforeend",
            componentSettings.template
        );
        document.body.appendChild(this._currentComponentElement);

        const componentInstance = new ComponentController(
            new ElementsController(this._currentComponentElement)
        );
        componentInstance.onInit && componentInstance.onInit();

        this._currentComponent = componentInstance;

        document.title = document.title.split(' - ')[0] + ' - ' + route.name;
    }

    destroyComponent() {

        if (this._currentComponent && this._currentComponentElement) {
            this._currentComponent.onDestroy && this._currentComponent.onDestroy();
            document.body.removeChild(this._currentComponentElement);
        }
    }
}

export const router = new Router([
    {
        path: '/',
        name: 'Search',
        loadChildren: () => import('../components/search.component.js').then(m => m)
    },
    {
        path: '/track',
        name: 'Track',
        loadChildren: () => import('../components/track.component.js').then(m => m)
    },
]);