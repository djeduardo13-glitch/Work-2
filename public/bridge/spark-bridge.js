// Ponte verso i dati dello Spark Doc Hub.
// data.js e fleet.js dichiarano costanti globali (const ERRORS = …) che un modulo non vede come window.X:
// questo script classico, caricato subito dopo, le copia in window.__SPARK__.
(function () {
  var pick = function (f) { try { return f(); } catch (e) { return undefined; } };
  window.__SPARK__ = {
    FW_VERSIONS: pick(function () { return FW_VERSIONS; }),
    ERRORS: pick(function () { return ERRORS; }),
    ERROR_COMPONENTS: pick(function () { return ERROR_COMPONENTS; }),
    COMPONENTS: pick(function () { return COMPONENTS; }),
    SENSOR_DETAILS: pick(function () { return SENSOR_DETAILS; }),
    PROCEDURES: pick(function () { return PROCEDURES; }),
    PARAMETERS: pick(function () { return PARAMETERS; }),
    DOCUMENTS: pick(function () { return DOCUMENTS; }),
    SPARK_FLEET: pick(function () { return SPARK_FLEET; })
  };
})();
