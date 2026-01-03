//All additional routes can be defined here and exported

module.exports = function(app) {

    app.get('/getapps', (req, res) => {
        const apps = getPluginList();
        _.each(apps, (app, key) => {
            delete app.service;
            delete app.www;
        });

        res.json(Object.values(apps));
    });
}