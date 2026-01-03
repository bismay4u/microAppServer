//Demo module service configurations

module.exports = function(basePath, app) {

    app.get(basePath+'/test1', (req, res) => {
        res.send("Hello from Demo Module!");
    });

    // console.log("Demo Module Service Loaded ", basePath+'/test1');
}