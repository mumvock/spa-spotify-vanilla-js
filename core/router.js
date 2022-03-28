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
            listenNavigate: (element, path, data) => this.listenNavigate(element, path, data),
            currentPath: this.currentPath,
            navigate: (path) => this.navigate(path),
            previousRoute: this.previousRoute,
            routes,
        };
    }

    listenNavigate(element, path, data) {
        element.addEventListener('click', () => this.navigate(path, data), false)
    }

    navigate(path, data) {
        let route = this.routes.filter((route) => route.path === path)[0];

        if (!route) {
            return;
        }

        this.destroyComponent();
        this.appendComponent(route, data);
    }

    async appendComponent(route, data) {
        this.previousRoute = this.currentPath();
        // window.history.pushState({}, '', route.path);
        
        const { ComponentController, ElementsController } = await route.loadChildren();

        this._currentComponentElement = document.createElement(route.name.toLowerCase() + '-component');
        
        const componentInstance = new ComponentController(
            new ElementsController(this._currentComponentElement),
            data
        );

        this._currentComponentElement.insertAdjacentHTML(
            "beforeend",
            componentInstance.template(data)
        );
    
        document.body.appendChild(this._currentComponentElement);
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
        path: '/details',
        name: 'Details',
        loadChildren: () => import('../components/details.component.js').then(m => m)
    },
]);