export class ComponentController {
    template = (data) => `
        <header>
            <h3>${data.type.charAt(0).toUpperCase() + data.type.slice(1)}</h3>
            <h1>${data.name}</h1>
            <p>${data.genres.join(', ')}</p>
            <p>${data.followers.total} followers</p>
            <div style="background-image: url('${data.images[0].url}')"></div>
        </header>
    `;
    elementsController;

    constructor(ElementsController, data) {
        this.elementsController = ElementsController;
        console.log('DATA >>>', data);

        // Exported properties
        return {
            onInit: this.onInit,
            onDestroy: this.onDestroy,
            template: this.template,
        };
    }

    onInit = () => {
    };

    onDestroy = () => {
    };
}

export class ElementsController {
    componentElement;

    constructor(componentElement) {
        this.componentElement = componentElement;

        // Exported properties
        return {
           
        };
    }
}
