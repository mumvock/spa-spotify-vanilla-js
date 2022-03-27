const SpotifyRepository = (() => {
    let token = "";

    const getToken = (async() => {
        const requestToken = async () => {
            const clientId = "cceaa5f812a84946b7c8095b83499ab8";
            const clientSecret = "7d07e7dc30e84713b0362393f346b3f0";

            const result = await fetch(
                "https://accounts.spotify.com/api/token",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization:
                            "Basic " + btoa(clientId + ":" + clientSecret),
                    },
                    body: "grant_type=client_credentials",
                }
            );

            const response = await result.json();
            return (token = response.access_token);
        };

        return token || await requestToken();
    })();

    return {
        async searchAll (value) {
            return fetch(
                `https://api.spotify.com/v1/search?q=${value}&type=album,artist,track&limit=7`,
                {
                    method: "GET",
                    headers: {
                        Authorization: "Bearer " + (await getToken),
                    },
                }
            ).then(async (response) => {
                const data = await response.json();
    
                return Object.entries(Object.keys(data).reduce(
                    (previousValue, currentValue) =>
                        data[currentValue].items[0] 
                            ? {
                                  ...previousValue,
                                  [currentValue]: data[currentValue].items,
                              }
                            : previousValue,
                    {}
                ));
            });
        }
    };
})();
export default SpotifyRepository;