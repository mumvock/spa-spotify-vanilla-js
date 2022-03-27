import SpotifyRepository from "../repositories/spotify.repository.js";
import { router } from "./../core/router.js";

export const componentSettings = {
    selector: "search-component",
    template: `
        <header>
            <img src="./assets/images/spotify-logo.svg" alt="Spotify logo">
            <form>
    
                <input type="text" name="search" placeholder="Track, artist or album">
    
                <button type="submit" title="Search"><span class="material-icons">search</span></button>
            </form>
        </header>
    `,
};

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
        this.elementsController.centralizeClass.add();
        this.listenSubmit();
    };

    onDestroy = () => {
    };

    listenSubmit = () => {
        this.elementsController
            .form()
            .addEventListener("submit", this.searchAll, true);
    };

    searchAll = async ({ target }) => {
        const value = new FormData(target).get("search");

        if (!value || value.length < 3) {
            return;
        }

        const searchResult = await SpotifyRepository.searchAll(value);

        if (searchResult.length) {
            this.elementsController.results.create(searchResult);
        } else {
            this.elementsController.notFound.create();
        }
    };
}

export class ElementsController {
    componentElement;

    constructor(componentElement) {
        this.componentElement = componentElement;

        // Exported properties
        return {
            form: this.form,
            results: this.results,
            notFound: this.notFound,
            centralizeClass: this.centralizeClass,
        };
    }

    centralizeClass = (() => ({
        remove: () =>
            this.componentElement.classList.remove("centralize"),
        add: () => this.componentElement.classList.add("centralize"),
    }))();

    form = (() => {
        let HTMLElements;
        const getElements = () =>
            (HTMLElements =
                this.componentElement.getElementsByTagName("form")[0]);

        // Exported properties
        return () => HTMLElements || getElements();
    })();

    results = (() => {
        let _sectionElements;

        const createSection = (type) => {
            _sectionElements = {
                ..._sectionElements,
                [type]: (() => {
                    const section = document.createElement("section");
                    section.insertAdjacentHTML(
                        "beforeend",
                        `<h2>${
                            type.charAt(0).toUpperCase() + type.slice(1)
                        }</h2>`
                    );
                    this.componentElement.appendChild(section);

                    return section;
                })(),
            };
        };

        const createCard = (value, type) => {
            const archorElement = document.createElement("a");
            router.listenNavigate(archorElement, "/" + type.slice(0, -1));

            const images =
                value?.album?.images ||
                (value.images && value?.images);

            // Pega a menor imagem contanto que seja maior que 95px (96px é o tamanho mínimo exibido nos cards)
            const image = images.reduce((p, c) => ((p.height || 9999) > c.height) && (c.height > 95) ? c : p, {});

            archorElement.insertAdjacentHTML(
                "beforeend", `
                <img src="${image?.url || "./assets/images/placeholder.png"}" alt="${value.name} image">
                <p>${value.name}</p>
                <span>
                    ${
                        type !== "artists"
                            ? value.artists.reduce(
                                  (p, c) =>
                                      p.length ? p + ", " + c.name : c.name,
                                  ""
                              )
                            : ""
                    }
                </span>
            `);

            return archorElement;
        };

        const remove = () => {
            if (_sectionElements) {
                Object.values(_sectionElements).forEach((section) =>
                    this.componentElement.removeChild(section)
                );
                _sectionElements = undefined;
            }
        };

        const create = (searchResult) => {
            this.centralizeClass.remove();
            this.notFound.remove();
            remove();

            searchResult.forEach(([type, result]) => {
                createSection(type);

                result.forEach((value) =>
                    _sectionElements[type].appendChild(createCard(value, type))
                );
            });
        };

        // Exported properties
        return {
            create: (searchResult) => create(searchResult),
            remove,
        };
    })();

    notFound = (() => {
        let _notFoundElement;

        const remove = () => {
            if (_notFoundElement) {
                this.componentElement.removeChild(_notFoundElement);
                _notFoundElement = undefined;
            }
        };

        const create = () => {
            this.results.remove();
            remove();

            const element = document.createElement("section");
            element.setAttribute("id", "not-found");
            element.insertAdjacentHTML(
                "beforeend",
                `
                <span class="material-icons">error_outline</span>
                <div>
                    <h2>Nothing found</h2>
                    <span>Make sure you typed correctly or use fewer keywords or use different keywords.</span>
                </div>
            `
            );
            _notFoundElement = this.componentElement.appendChild(element);
        };

        return {
            create,
            remove,
        };
    })();
}
