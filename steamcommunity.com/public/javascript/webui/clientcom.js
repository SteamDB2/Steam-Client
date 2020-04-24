/*! This file includes third-party software, governed by the licenses described here: https://steamcommunity.com/public/javascript/webui/clientcom.licenses.txt */

/**** (c) Valve Corporation. Use is governed by the terms of the Steam Subscriber Agreement http://store.steampowered.com/subscriber_agreement/.
 ****/
var CLSTAMP = "5823084";
!(function(t) {
  var e = {};
  function n(r) {
    if (e[r]) return e[r].exports;
    var o = (e[r] = { i: r, l: !1, exports: {} });
    return t[r].call(o.exports, o, o.exports, n), (o.l = !0), o.exports;
  }
  (n.m = t),
    (n.c = e),
    (n.d = function(t, e, r) {
      n.o(t, e) || Object.defineProperty(t, e, { enumerable: !0, get: r });
    }),
    (n.r = function(t) {
      "undefined" != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(t, Symbol.toStringTag, { value: "Module" }),
        Object.defineProperty(t, "__esModule", { value: !0 });
    }),
    (n.t = function(t, e) {
      if ((1 & e && (t = n(t)), 8 & e)) return t;
      if (4 & e && "object" == typeof t && t && t.__esModule) return t;
      var r = Object.create(null);
      if (
        (n.r(r),
        Object.defineProperty(r, "default", { enumerable: !0, value: t }),
        2 & e && "string" != typeof t)
      )
        for (var o in t)
          n.d(
            r,
            o,
            function(e) {
              return t[e];
            }.bind(null, o)
          );
      return r;
    }),
    (n.n = function(t) {
      var e =
        t && t.__esModule
          ? function() {
              return t.default;
            }
          : function() {
              return t;
            };
      return n.d(e, "a", e), e;
    }),
    (n.o = function(t, e) {
      return Object.prototype.hasOwnProperty.call(t, e);
    }),
    (n.p = ""),
    n((n.s = "x0hG"));
})({
  "/7KC": function(t, e, n) {
    "use strict";
    function r(t, e) {
      return (
        (t = Math.ceil(t)),
        (e = Math.floor(e)),
        Math.floor(Math.random() * (e - t + 1)) + t
      );
    }
    function o(t, e, n) {
      return Math.max(e, Math.min(n, t));
    }
    function i(t, e, n, r, o) {
      return r + ((o - r) * (t - e)) / (n - e);
    }
    n.d(e, "b", function() {
      return r;
    }),
      n.d(e, "a", function() {
        return o;
      }),
      n.d(e, "c", function() {
        return i;
      });
  },
  "1n9R": function(t, e, n) {
    "use strict";
    n("mrSG");
    var r = n("/7KC");
    function o() {
      return !!window.document;
    }
    n.d(e, "b", function() {
      return c;
    }),
      n.d(e, "h", function() {
        return u;
      }),
      n.d(e, "a", function() {
        return s;
      }),
      n.d(e, "e", function() {
        return f;
      }),
      n.d(e, "g", function() {
        return _;
      }),
      n.d(e, "f", function() {
        return p;
      }),
      n.d(e, "c", function() {
        return d;
      }),
      n.d(e, "d", function() {
        return m;
      });
    var i,
      c = {
        EUNIVERSE: 0,
        WEB_UNIVERSE: "",
        LANGUAGE: "english",
        SUPPORTED_LANGUAGES: [],
        COUNTRY: "",
        CDN_URL: "",
        MEDIA_CDN_COMMUNITY_URL: "",
        MEDIA_CDN_URL: "",
        COMMUNITY_CDN_URL: "",
        COMMUNITY_CDN_ASSET_URL: "",
        STORE_CDN_URL: "",
        PUBLIC_SHARED_URL: "",
        COMMUNITY_BASE_URL: "",
        CHAT_BASE_URL: "",
        STORE_BASE_URL: "",
        STORE_ICON_BASE_URL: "",
        IMG_URL: "",
        STEAMTV_BASE_URL: "",
        HELP_BASE_URL: "",
        PARTNER_BASE_URL: "",
        IN_CLIENT: !1,
        USE_POPUPS: !1,
        IN_MOBILE: !1,
        IN_TENFOOT: !1,
        PLATFORM: "",
        SNR: "",
        LOCAL_HOSTNAME: "",
        WEBAPI_BASE_URL: "",
        TOKEN_URL: "",
        BUILD_TIMESTAMP: 0,
        PAGE_TIMESTAMP: 0,
        get SESSIONID() {
          return (function() {
            if (!o()) return i || (i = f()), i;
            var t = (function(t) {
              if (!o() || !window.document.cookie) return null;
              var e = document.cookie.match("(^|; )" + t + "=([^;]*)");
              return e && e[2] ? decodeURIComponent(e[2]) : null;
            })("sessionid");
            t || (t = f());
            return t;
          })();
        },
        FRIENDSUI_BETA: !1,
        STEAM_TV: !1,
        DEV_MODE: !1,
        OFFLINE_MODE: !1
      },
      u = {
        logged_in: !1,
        steamid: "",
        accountid: 0,
        account_name: "",
        token: void 0,
        token_use_id: void 0,
        webapi_token: "",
        authwgtoken: "",
        is_support: !1,
        is_limited: !1,
        short_url: "",
        country_code: ""
      },
      s = { steamid: "", clanid: 0, listid: 0 },
      a = {
        CLANSTEAMID: "",
        CLANACCOUNTID: 0,
        ANNOUNCEMENT_GID: "",
        IMG_URL: "",
        APPID: 0,
        VANITY_ID: "",
        IS_CREATOR_HOME: !1,
        IS_CURATOR: !1,
        CAN_UPLOAD_IMAGES: !1,
        HEADER_IMAGE: "",
        APP_NAME: "",
        HAS_ADULT_CONTENT: !1,
        HAS_ADULT_CONTENT_SEX: !1,
        HAS_ADULT_CONTENT_VIOLENCE: !1
      },
      l = "webui_config";
    function f() {
      var t = (function() {
        for (var t = "", e = 0; e < 24; e++)
          t += Object(r.b)(0, 35).toString(36);
        return t;
      })();
      return (
        (function(t, e, n, r) {
          if (o()) {
            r || (r = "/");
            var i = "";
            if (void 0 !== n && n) {
              var c = new Date();
              c.setTime(c.getTime() + 864e5 * n),
                (i = "; expires=" + c.toUTCString());
            }
            document.cookie =
              encodeURIComponent(t) +
              "=" +
              encodeURIComponent(e) +
              i +
              ";path=" +
              r;
          }
        })("sessionid", t, 0),
        t
      );
    }
    function _(t) {
      void 0 === t && (t = l);
      var e = {},
        n = p("config", t);
      n && (delete n.SESSIONID, Object.assign(c, n), (e.config = !0));
      var r = p("userinfo", t);
      r && (Object.assign(u, r), (e.userConfig = !0));
      var o = p("broadcast", t);
      o && (Object.assign(s, o), (e.broadcastConfig = !0));
      var i = p("community", t);
      return i && (Object.assign(a, i), (e.communityConfig = !0)), e;
    }
    function p(t, e) {
      var n;
      if (
        (void 0 === e && (e = l),
        (n = "string" == typeof e ? document.getElementById(e) : e))
      )
        try {
          return n.hasAttribute("data-" + t)
            ? JSON.parse(n.getAttribute("data-" + t))
            : null;
        } catch (t) {
          console.error("Failed to parse config", t);
        }
      else console.error("Missing config element #", e);
    }
    function d() {
      var t = window.location.href;
      return t.startsWith(c.STORE_BASE_URL)
        ? c.STORE_BASE_URL
        : t.startsWith(c.COMMUNITY_BASE_URL)
        ? c.COMMUNITY_BASE_URL
        : t.startsWith(c.PARTNER_BASE_URL)
        ? c.PARTNER_BASE_URL
        : t.startsWith(c.HELP_BASE_URL)
        ? c.HELP_BASE_URL
        : t.startsWith(c.STEAMTV_BASE_URL)
        ? c.STEAMTV_BASE_URL
        : "";
    }
    function m() {
      var t = window.location.href;
      return t.startsWith(c.STORE_BASE_URL)
        ? "store"
        : t.startsWith(c.COMMUNITY_BASE_URL)
        ? "community"
        : t.startsWith(c.PARTNER_BASE_URL)
        ? "partnerweb"
        : t.startsWith(c.HELP_BASE_URL)
        ? "help"
        : t.startsWith(c.STEAMTV_BASE_URL)
        ? "steamtv"
        : "";
    }
  },
  Ezvv: function(t, e, n) {
    "use strict";
    n.d(e, "a", function() {
      return i;
    }),
      n.d(e, "b", function() {
        return u;
      });
    var r = n("1n9R"),
      o = { success: !0, result: 1 },
      i = (function() {
        function t() {
          (this.m_connection = new c()),
            (this.m_bAllowAccountMismatch = !1),
            (this.m_mapCacheSubscribedApp = new Map());
        }
        return (
          (t.prototype.FailureResult = function(t) {
            void 0 === t && (t = 2);
            var e = { success: !1, result: t };
            return (
              this.m_connection &&
                !this.m_connection.browser_supported &&
                (e.browser_unsupported = !0),
              this.m_connection &&
                !this.m_connection.connected_to_client &&
                (e.connect_failed = !0),
              7 == t && (e.call_unsupported = !0),
              e
            );
          }),
          (t.prototype.SetAllowAccountMismatch = function(t) {
            this.m_bAllowAccountMismatch = t;
          }),
          (t.prototype.BClientConnected = function() {
            var t = this;
            return this.m_connection.Connect().then(
              function() {
                return o;
              },
              function() {
                return t.FailureResult();
              }
            );
          }),
          (t.prototype.BClientSupportsMessage = function(t) {
            return (
              !(
                !this.m_connection.connected_to_client ||
                !this.m_connection.ready
              ) &&
              -1 !== this.m_connection.ClientInfo.rgSupportedMessages.indexOf(t)
            );
          }),
          (t.prototype.OpenFriendChatDialog = function(t) {
            var e = { message: "ShowFriendChatDialog", steamid: t };
            return this.GenericEResultCall(e);
          }),
          (t.prototype.OpenChatRoomGroupDialog = function(t, e) {
            var n = { message: "ShowChatRoomGroupDialog", chat_group_id: t };
            return e && (n.chat_room_id = e), this.GenericEResultCall(n);
          }),
          (t.prototype.ShowChatRoomGroupInvite = function(t) {
            var e = { message: "ShowChatRoomGroupInvite", invite_code: t };
            return this.GenericEResultCall(e);
          }),
          (t.prototype.OpenJoinGameDialog = function(t) {
            var e = { message: "ShowJoinGameDialog", friend_id: t };
            return this.GenericEResultCall(e);
          }),
          (t.prototype.BIsSubscribedApp = function(t) {
            var e = this;
            if (this.m_mapCacheSubscribedApp.has(t))
              return Promise.resolve(this.m_mapCacheSubscribedApp.get(t));
            var n = { message: "IsSubscribedApp", appid: t };
            return this.GenericEResultCall(n).then(function(n) {
              if (!n.connect_failed) {
                var r = 1 == n.result;
                return e.m_mapCacheSubscribedApp.set(t, r), r;
              }
            });
          }),
          (t.prototype.ViewGameInfoForSteamID = function(t) {
            var e = { message: "ViewGameInfoForSteamID", steamid: t };
            return this.GenericEResultCall(e);
          }),
          (t.prototype.OpenFriendsDialog = function() {
            return this.GenericEResultCall({ message: "OpenFriendsDialog" });
          }),
          (t.prototype.BClientAccountMatches = function() {
            return (
              !r.h.logged_in ||
              r.h.accountid == this.m_connection.ClientInfo.unAccountID
            );
          }),
          (t.prototype.GenericEResultCall = function(t) {
            var e = this;
            return this.m_connection
              .Connect()
              .then(function() {
                return e.m_bAllowAccountMismatch || e.BClientAccountMatches()
                  ? e.m_connection.SendMsgAndAwaitResponse(t).then(function(t) {
                      return 1 === t.success ? o : e.FailureResult(t.success);
                    })
                  : { success: !1, result: 19, account_mismatch: !0 };
              })
              .catch(function() {
                return e.FailureResult();
              });
          }),
          t
        );
      })(),
      c = (function() {
        function t() {
          (this.m_mapWaitingCallbacks = new Map()),
            (this.m_iCallSeq = 1),
            (this.m_bReady = !1),
            (this.m_bClientConnectionFailed = !1),
            (this.m_bSecurityException = !1),
            (this.m_ClientInfo = {
              ulVersion: "",
              bFriendsUIEnabled: !1,
              unAccountID: 0,
              rgSupportedMessages: []
            });
        }
        return (
          Object.defineProperty(t.prototype, "ClientInfo", {
            get: function() {
              return this.m_ClientInfo;
            },
            enumerable: !0,
            configurable: !0
          }),
          Object.defineProperty(t.prototype, "ready", {
            get: function() {
              return this.m_bReady;
            },
            enumerable: !0,
            configurable: !0
          }),
          Object.defineProperty(t.prototype, "browser_supported", {
            get: function() {
              return !this.m_bSecurityException;
            },
            enumerable: !0,
            configurable: !0
          }),
          Object.defineProperty(t.prototype, "connected_to_client", {
            get: function() {
              return (
                this.m_socket && this.m_socket.readyState == WebSocket.OPEN
              );
            },
            enumerable: !0,
            configurable: !0
          }),
          (t.prototype.SendMsgAndAwaitResponse = function(t) {
            var e = this;
            return new Promise(function(n, r) {
              var o = e.m_iCallSeq++;
              e.BSendMsg(t, o)
                ? e.m_mapWaitingCallbacks.set(o, {
                    iSeq: o,
                    fnCallback: n,
                    fnError: r
                  })
                : r();
            });
          }),
          (t.prototype.BSendMsg = function(t, e) {
            if (!this.m_socket || this.m_socket.readyState != WebSocket.OPEN)
              return !1;
            var n = Object.assign({}, t, {
              universe: r.b.EUNIVERSE,
              accountid: r.h.accountid
            });
            void 0 !== e && (n.sequenceid = e);
            try {
              return this.m_socket.send(JSON.stringify(n)), !0;
            } catch (t) {
              return !1;
            }
          }),
          (t.prototype.OnSocketMessage = function(t) {
            try {
              var e = JSON.parse(t.data);
              if (e.sequenceid) {
                var n = this.m_mapWaitingCallbacks.get(e.sequenceid);
                if (n)
                  return (
                    this.m_mapWaitingCallbacks.delete(e.sequenceid),
                    void n.fnCallback(e)
                  );
              }
            } catch (t) {
              console.error("exception parsing response", t);
            }
          }),
          (t.prototype.Connect = function() {
            var t = this;
            if (this.m_bReady && this.m_socket.readyState == WebSocket.OPEN)
              return Promise.resolve();
            if (this.m_promiseConnect) return this.m_promiseConnect;
            var e = new Promise(function(e, n) {
              try {
                t.m_socket = new WebSocket(
                  "ws://127.0.0.1:27060/clientsocket/"
                );
              } catch (e) {
                return (t.m_bSecurityException = !0), void n(e);
              }
              (t.m_socket.onerror = function(t) {
                n();
              }),
                (t.m_socket.onmessage = t.OnSocketMessage.bind(t)),
                (t.m_socket.onopen = function(r) {
                  t.SendMsgAndAwaitResponse({ message: "GetClientInfo" })
                    .then(function(r) {
                      1 == r.success
                        ? ((t.m_ClientInfo.ulVersion = r.clientversion),
                          (t.m_ClientInfo.bFriendsUIEnabled = !!r.friendsui),
                          (t.m_ClientInfo.unAccountID = r.accountid),
                          r.supported_messages &&
                            (t.m_ClientInfo.rgSupportedMessages =
                              r.supported_messages),
                          e())
                        : n();
                    })
                    .catch(n);
                });
            });
            return (
              (this.m_promiseConnect = e),
              this.m_promiseConnect
                .then(function() {
                  (t.m_bReady = !0), (t.m_promiseConnect = void 0);
                })
                .catch(function() {
                  (t.m_bClientConnectionFailed = !0),
                    (t.m_promiseConnect = void 0);
                }),
              this.m_promiseConnect
            );
          }),
          t
        );
      })(),
      u = new i();
    window.ClientConnectionAPI = u;
  },
  mrSG: function(t, e, n) {
    "use strict";
    n.d(e, "d", function() {
      return o;
    }),
      n.d(e, "a", function() {
        return i;
      }),
      n.d(e, "f", function() {
        return c;
      }),
      n.d(e, "c", function() {
        return u;
      }),
      n.d(e, "b", function() {
        return s;
      }),
      n.d(e, "e", function() {
        return a;
      }),
      n.d(e, "g", function() {
        return l;
      });
    /*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
    var r = function(t, e) {
      return (r =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function(t, e) {
            t.__proto__ = e;
          }) ||
        function(t, e) {
          for (var n in e) e.hasOwnProperty(n) && (t[n] = e[n]);
        })(t, e);
    };
    function o(t, e) {
      function n() {
        this.constructor = t;
      }
      r(t, e),
        (t.prototype =
          null === e
            ? Object.create(e)
            : ((n.prototype = e.prototype), new n()));
    }
    var i = function() {
      return (i =
        Object.assign ||
        function(t) {
          for (var e, n = 1, r = arguments.length; n < r; n++)
            for (var o in (e = arguments[n]))
              Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
          return t;
        }).apply(this, arguments);
    };
    function c(t, e) {
      var n = {};
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) &&
          e.indexOf(r) < 0 &&
          (n[r] = t[r]);
      if (null != t && "function" == typeof Object.getOwnPropertySymbols) {
        var o = 0;
        for (r = Object.getOwnPropertySymbols(t); o < r.length; o++)
          e.indexOf(r[o]) < 0 &&
            Object.prototype.propertyIsEnumerable.call(t, r[o]) &&
            (n[r[o]] = t[r[o]]);
      }
      return n;
    }
    function u(t, e, n, r) {
      var o,
        i = arguments.length,
        c =
          i < 3
            ? e
            : null === r
            ? (r = Object.getOwnPropertyDescriptor(e, n))
            : r;
      if ("object" == typeof Reflect && "function" == typeof Reflect.decorate)
        c = Reflect.decorate(t, e, n, r);
      else
        for (var u = t.length - 1; u >= 0; u--)
          (o = t[u]) &&
            (c = (i < 3 ? o(c) : i > 3 ? o(e, n, c) : o(e, n)) || c);
      return i > 3 && c && Object.defineProperty(e, n, c), c;
    }
    function s(t, e, n, r) {
      return new (n || (n = Promise))(function(o, i) {
        function c(t) {
          try {
            s(r.next(t));
          } catch (t) {
            i(t);
          }
        }
        function u(t) {
          try {
            s(r.throw(t));
          } catch (t) {
            i(t);
          }
        }
        function s(t) {
          t.done
            ? o(t.value)
            : new n(function(e) {
                e(t.value);
              }).then(c, u);
        }
        s((r = r.apply(t, e || [])).next());
      });
    }
    function a(t, e) {
      var n,
        r,
        o,
        i,
        c = {
          label: 0,
          sent: function() {
            if (1 & o[0]) throw o[1];
            return o[1];
          },
          trys: [],
          ops: []
        };
      return (
        (i = { next: u(0), throw: u(1), return: u(2) }),
        "function" == typeof Symbol &&
          (i[Symbol.iterator] = function() {
            return this;
          }),
        i
      );
      function u(i) {
        return function(u) {
          return (function(i) {
            if (n) throw new TypeError("Generator is already executing.");
            for (; c; )
              try {
                if (
                  ((n = 1),
                  r &&
                    (o =
                      2 & i[0]
                        ? r.return
                        : i[0]
                        ? r.throw || ((o = r.return) && o.call(r), 0)
                        : r.next) &&
                    !(o = o.call(r, i[1])).done)
                )
                  return o;
                switch (((r = 0), o && (i = [2 & i[0], o.value]), i[0])) {
                  case 0:
                  case 1:
                    o = i;
                    break;
                  case 4:
                    return c.label++, { value: i[1], done: !1 };
                  case 5:
                    c.label++, (r = i[1]), (i = [0]);
                    continue;
                  case 7:
                    (i = c.ops.pop()), c.trys.pop();
                    continue;
                  default:
                    if (
                      !(o = (o = c.trys).length > 0 && o[o.length - 1]) &&
                      (6 === i[0] || 2 === i[0])
                    ) {
                      c = 0;
                      continue;
                    }
                    if (3 === i[0] && (!o || (i[1] > o[0] && i[1] < o[3]))) {
                      c.label = i[1];
                      break;
                    }
                    if (6 === i[0] && c.label < o[1]) {
                      (c.label = o[1]), (o = i);
                      break;
                    }
                    if (o && c.label < o[2]) {
                      (c.label = o[2]), c.ops.push(i);
                      break;
                    }
                    o[2] && c.ops.pop(), c.trys.pop();
                    continue;
                }
                i = e.call(t, c);
              } catch (t) {
                (i = [6, t]), (r = 0);
              } finally {
                n = o = 0;
              }
            if (5 & i[0]) throw i[1];
            return { value: i[0] ? i[1] : void 0, done: !0 };
          })([i, u]);
        };
      }
    }
    function l() {
      for (var t = 0, e = 0, n = arguments.length; e < n; e++)
        t += arguments[e].length;
      var r = Array(t),
        o = 0;
      for (e = 0; e < n; e++)
        for (var i = arguments[e], c = 0, u = i.length; c < u; c++, o++)
          r[o] = i[c];
      return r;
    }
  },
  tkkQ: function(t, e, n) {
    "use strict";
    var r = n("1n9R");
    n.d(e, "a", function() {
      return r.b;
    }),
      n.d(e, "d", function() {
        return r.h;
      }),
      n.d(e, "c", function() {
        return r.g;
      }),
      n.d(e, "b", function() {
        return r.f;
      });
  },
  x0hG: function(t, e, n) {
    "use strict";
    n.r(e);
    var r = n("tkkQ"),
      o = n("Ezvv");
    document.addEventListener("DOMContentLoaded", function() {
      Object(r.c)(), (window.ClientConnectionAPI = o.b);
    });
  }
});
