export const componentSettings = {
    selector: "track-component",
    template: `
        <h1>Track</h1>
    `
}

export class ComponentController {
    elementsController;

    constructor(ElementsController) {
        this.elementsController = ElementsController;

        // Exported properties
        return {
            onInit: this.onInit,
            onDestroy: this.onDestroy,
        };
    }

    onInit = () => {
    };

    onDestroy = () => {
        console.log("destruiu");
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
