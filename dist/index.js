"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Esi = void 0;
var node_fetch_1 = __importDefault(require("node-fetch"));
var Esi = /** @class */ (function () {
    function Esi(userAgent) {
        this.userAgent = userAgent;
        this.errorManager = new ErrorManager();
    }
    Esi.prototype.request = function (props) {
        return __awaiter(this, void 0, void 0, function () {
            var method, path, _a, urlSearchParams, _b, token, _c, body, fetchProps, query, response, e_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        method = props.method, path = props.path, _a = props.urlSearchParams, urlSearchParams = _a === void 0 ? null : _a, _b = props.token, token = _b === void 0 ? null : _b, _c = props.body, body = _c === void 0 ? null : _c;
                        if (this.errorManager.getErrorRemain() < 1) {
                            throw new Error('No remaining error in the current window, call blocked');
                        }
                        fetchProps = {};
                        fetchProps.method = method;
                        fetchProps.headers = {
                            'Content-Type': 'application/json',
                            'X-User-Agent': this.userAgent
                        };
                        if (token !== null) {
                            fetchProps.headers['Authorization'] = "Bearer " + token;
                        }
                        if (body !== null) {
                            fetchProps.body = body;
                        }
                        query = '';
                        if (urlSearchParams !== null) {
                            query = "?" + urlSearchParams.toString();
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, node_fetch_1.default("https://esi.evetech.net" + path + query, fetchProps)];
                    case 2:
                        response = _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _d.sent();
                        this.errorManager.flagError();
                        throw new Error(e_1);
                    case 4:
                        if (!response.ok) {
                            if (response.status === 420) { // Error limited
                                this.errorManager.flagErrorLimited(response.headers);
                            }
                            else {
                                this.errorManager.flagError(response.headers);
                            }
                            throw new Error("Error " + response.status + ": " + response.statusText);
                        }
                        return [2 /*return*/, response];
                }
            });
        });
    };
    Esi.prototype.paginatedRequest = function (props) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var firstResponse, pages, headerPages, responseStack, i, urlSearchParams, newProps;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.request(props)];
                    case 1:
                        firstResponse = _b.sent();
                        pages = 1;
                        headerPages = firstResponse.headers.get('x-pages');
                        if (headerPages !== null) {
                            pages = Number(headerPages);
                        }
                        responseStack = [
                            new Promise(function () { return firstResponse; })
                        ];
                        for (i = 2; i <= pages; i++) {
                            urlSearchParams = (_a = props.urlSearchParams) !== null && _a !== void 0 ? _a : new URLSearchParams();
                            urlSearchParams.set('page', String(i));
                            newProps = __assign({}, props);
                            newProps.urlSearchParams = urlSearchParams;
                            responseStack.push(this.request(newProps));
                        }
                        return [2 /*return*/, responseStack];
                }
            });
        });
    };
    return Esi;
}());
exports.Esi = Esi;
var ErrorManager = /** @class */ (function () {
    function ErrorManager() {
        this.limitRemain = 100;
        this.limitReset = Date.now() + 60 * 1000;
    }
    ErrorManager.prototype.getErrorRemain = function () {
        if (this.limitReset < (Date.now() - 1)) {
            this.reset();
        }
        return this.limitRemain;
    };
    ErrorManager.prototype.getErrorReset = function () {
        if (this.limitReset < (Date.now() - 1)) {
            this.reset();
        }
        return this.limitReset;
    };
    ErrorManager.prototype.flagError = function (headers) {
        if (headers === void 0) { headers = null; }
        if (headers !== null && headers.get('x-esi-error-limit-reset') !== null) {
            this.limitReset = Number(headers.get('x-esi-error-limit-reset'));
        }
        this.limitRemain -= 1;
    };
    ErrorManager.prototype.flagErrorLimited = function (headers) {
        if (headers === void 0) { headers = null; }
        if (headers !== null && headers.get('x-esi-error-limit-reset') !== null) {
            this.limitReset = Number(headers.get('x-esi-error-limit-reset'));
        }
        this.limitRemain = 0;
    };
    ErrorManager.prototype.reset = function () {
        this.limitRemain = 100;
        this.limitReset = Date.now() + 60 * 1000;
    };
    return ErrorManager;
}());
