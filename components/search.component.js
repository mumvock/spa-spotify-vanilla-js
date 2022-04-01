import SpotifyRepository from '../repositories/spotify.repository.js';
import { router } from './../core/router.js';

export class ComponentController {
    template = () => `
        <header>
            <img src="./assets/images/spotify-logo.svg" alt="Spotify logo">
            <form spa="form">
                <input type="text" name="search" placeholder="Track, artist or album">
                <button type="submit" title="Search"><span class="material-icons">search</span></button>
            </form>
        </header>

        <spa-container spa="results" spa-if="this.searchResult">
            <section spa-for="item of this.searchResult">
                <h2>{{ item.type }}</h2>
                
                <a spa-for="item2 of item.items" href="{{ item2.uri }}" class="card-track">
                    <picture>
                        <img src="./assets/images/placeholder.png" alt="{{ item2.name }} image">
                        <span class="material-icons">play_arrow</span>
                    </picture>
                    
                    <p>{{ item2.name }}</p>
                    
                    <span spa-if="item2.artists.length">
                        {{ item2.artists.reduce(
                            (p, c) => (p.length ? p + ', ' + c.name : c.name),
                            ''
                        )}}
                    </span>
                </a>
            </section>
        </spa-container>
    `;

    elementsController;
    searchResult;
    searchHasStarted = false;

    constructor(ElementsController) {
        this.elementsController = ElementsController;

        // // Exported properties
        // return {
        //     onInit: this.onInit,
        //     onDestroy: this.onDestroy,
        //     template: this.template,
        //     searchHasStarted: () => this.searchHasStarted,
        //     searchResult: () => this.searchResult,
        // };
    }

    onInit = () => {
        this.centralizeClass().add();
        this.listenSubmit();
    };

    onDestroy = () => {};

    listenSubmit = () => {
        this.elementsController
            .getSpaElement('form')
            .addEventListener('submit', this.searchAll, true);
    };

    searchAll = async ({ target }) => {
        const value = new FormData(target).get('search');

        if (!value || value.length < 3) {
            return;
        }

        this.searchResult = await SpotifyRepository.searchAll(value);

        if (this.searchResult.length) {
            this.searchHasStarted = true;
            this.centralizeClass().remove();
            this.elementsController.refresh('results');
        }

        this.elementsController.refresh('notFound');
    };

    centralizeClass() {
        const { componentElementRef } = this.elementsController;

        return {
            remove: () => componentElementRef.classList.remove('centralize'),
            add: () => componentElementRef.classList.add('centralize'),
        };
    }
}

const createCard = (value, type) => {
    const archorElement = document.createElement('a');

    if (type === 'tracks') {
        archorElement.setAttribute('href', value.uri);
        archorElement.classList.add('card-track');
    } else {
        router.listenNavigate(archorElement, '/details', value);
    }

    const images = value?.album?.images || (value.images && value?.images);

    // Pega a menor imagem contanto que seja maior que 95px (96px é o tamanho mínimo exibido nos cards)
    const image = value?.album?.images || (value.images && value?.images).reduce(
        (p, c) => ((p.height || 9999) > c.height && c.height > 95 ? c : p),
        {}
    );

    archorElement.insertAdjacentHTML(
        'beforeend',
        `
        <picture>
            <img src="${
                image?.url || './assets/images/placeholder.png'
            }" alt="${value.name} image">
            <span class="material-icons">play_arrow</span>
        </picture>
        <p>${value.name}</p>
        <span>
            ${
                type !== 'artists'
                    ? value.artists.reduce(
                          (p, c) => (p.length ? p + ', ' + c.name : c.name),
                          ''
                      )
                    : ''
            }
        </span>
    `
    );

    return archorElement;
};
