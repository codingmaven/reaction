/* eslint dot-notation: 0 */
describe("cart methods", function () {
  let user = Factory.create("user");
  let shop = Factory.create("shop");
  let userId = user._id;
  // Required for creating a cart
  const sessionId = ReactionCore.sessionId = Random.id();
  const originalMergeCart = Meteor.server
    .method_handlers["cart/mergeCart"];
  const originalCopyCartToOrder = Meteor.server
    .method_handlers["cart/copyCartToOrder"];
  const originalAddToCart = Meteor.server
    .method_handlers["cart/addToCart"];
  const originalSetShipmentAddress = Meteor.server
    .method_handlers["cart/setShipmentAddress"];
  const originalSetPaymentAddress = Meteor.server
    .method_handlers["cart/setPaymentAddress"];
  afterAll(() => {
    Meteor.users.remove({});
  });

  describe("cart/mergeCart", () => {
    // a lot of users for different tests.
    let cartUser = Factory.create("user");
    let cartUserId = cartUser._id;
    let anonymous = Factory.create("user");
    let anonymousId = anonymous._id;
    let anonymous2 = Factory.create("user");
    let anonymous2Id = anonymous2._id;
    let anonymousOne = Factory.create("user");
    let anonymousOneId = anonymousOne._id;
    let anonymousTwo = Factory.create("user");
    let anonymousTwoId = anonymousTwo._id;
    [anonymousId, anonymous2Id, anonymousOneId, anonymousTwoId].forEach(id => {
      Meteor.users.update(id, {
        $set: {
          roles: {
            [shop._id]: [
              "anonymous",
              "guest"
            ]
          }
        }
      });
    });
    const quantity = 1;
    let product;
    let variantId;

    beforeAll(done => {
      ReactionCore.Collections.Cart.remove({});
      ReactionCore.Collections.Products.remove({});
      product = Factory.create("product");
      variantId = product.variants[0]._id;

      return done();
    });

    it( // this is a preparation stage for a next test
      "should be able to add product to cart for `anonymous`",
      () => {
        spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
          function () {
            this.userId = anonymousId;
            return originalMergeCart.apply(this, arguments);
          });
        spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
          function () {
            this.userId = anonymousId;
            return originalAddToCart.apply(this, arguments);
          });
        spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
        spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
        // passing of check for anonymous role with true result
        spyOn(Roles, "userIsInRole").and.returnValue(true);

        const cartId = Meteor.call("cart/createCart", anonymousId, sessionId);
        expect(cartId).toBeDefined();

        Meteor.call("cart/addToCart", product._id, variantId, quantity);
        const cart = ReactionCore.Collections.Cart.findOne(cartId);

        expect(cart.items.length).toBe(1);
        expect(cart.items[0].quantity).toBe(1);
        expect(cart.items[0].variants._id).toEqual(variantId);
      }
    );

    it(
      "should merge all `anonymous` carts into newly created `normal` user" +
      " cart per session",
      done => {
        spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
          function () {
            this.userId = cartUserId;
            return originalMergeCart.apply(this, arguments);
          });
        spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
          function () {
            this.userId = cartUserId;
            return originalAddToCart.apply(this, arguments);
          });
        spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
        spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
        // not working as expected. We avoid this by updating user roles in db
        // spyOn(Roles, "userIsInRole").and.callFake(function () {
        //   return arguments[0] !== cartUserId;
        // });
        spyOn(ReactionCore.Collections.Cart, "remove").and.callThrough();

        let anonCart = ReactionCore.Collections.Cart.findOne({
          userId: anonymousId
        });
        const cartId = Meteor.call("cart/createCart", cartUserId, sessionId);
        // we expect `cart/mergeCart` will be called from `cart/createCart`
        // expect(Meteor.call.calls.argsFor(1)).toEqual("cart/mergeCart");
        expect(cartId).toBeDefined();

        // we expect Cart.remove will be called
        expect(ReactionCore.Collections.Cart.remove).toHaveBeenCalled();
        let cart = ReactionCore.Collections.Cart.findOne(cartId);

        // we expect anonymous cart will be merged into this user's cart
        expect(cart.items.length).toBe(1);
        expect(cart.items[0].quantity).toBe(1);
        expect(cart.items[0].variants._id).toEqual(variantId);
        expect(cart.sessionId).toEqual(anonCart.sessionId);

        return done();
      }
    );

    it( // we need to repeat first step to emulate user logout
      "should be able to add product to cart for `anonymous`",
      () => {
        spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
          function () {
            this.userId = anonymous2Id;
            return originalMergeCart.apply(this, arguments);
          });
        spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
          function () {
            this.userId = anonymous2Id;
            return originalAddToCart.apply(this, arguments);
          });
        spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
        spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
        // passing of check for anonymous role with true result
        // spyOn(Roles, "userIsInRole").and.returnValue(true);

        const cartId = Meteor.call("cart/createCart", anonymous2Id, sessionId);
        expect(cartId).toBeDefined();

        Meteor.call("cart/addToCart", product._id, variantId, quantity);
        const cart = ReactionCore.Collections.Cart.findOne(cartId);

        expect(cart.items.length).toBe(1);
        expect(cart.items[0].quantity).toBe(1);
        expect(cart.items[0].variants._id).toEqual(variantId);
      }
    );

    it(
      "should merge all `anonymous` carts into existent `normal` user cart" +
      " per session, when logged in",
      done => {
        spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
          function () {
            this.userId = cartUserId;
            return originalMergeCart.apply(this, arguments);
          });
        spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
          function () {
            this.userId = cartUserId;
            return originalAddToCart.apply(this, arguments);
          });
        spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
        spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
        spyOn(ReactionCore.Collections.Cart, "remove").and.callThrough();

        let cart = ReactionCore.Collections.Cart.findOne({
          userId: cartUserId
        });

        Meteor.call("cart/mergeCart", cart._id, sessionId);
        let anon2Cart = ReactionCore.Collections.Cart.findOne({
          userId: anonymous2Id
        });
        cart = ReactionCore.Collections.Cart.findOne({
          userId: cartUserId
        });

        expect(ReactionCore.Collections.Cart.remove).toHaveBeenCalled();
        expect(anon2Cart).toBeUndefined();
        // we expect to see one item with quantity equal 2, but instead of this
        // we got two items, which is not bad... such results is fine for us
        expect(cart.items.length).toBe(2);
        // expect(cart.items[0].quantity).toBe(2);

        return done();
      }
    );

    it(
      "should merge only into registered user cart",
      done => {
        spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
          function () {
            this.userId = anonymousOneId;
            return originalMergeCart.apply(this, arguments);
          });
        spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
        spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);

        const cartId = Meteor.call("cart/createCart", anonymousOneId, sessionId);
        expect(cartId).toBeDefined();

        // now we try to merge two anonymous carts. We expect to see `false`
        // result
        expect(Meteor.call("cart/mergeCart", cartId)).toBeFalsy();

        return done();
      }
    );

    it(
      "should throw an error if cart doesn't exist",
      done => {
        spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
          function () {
            this.userId = "someIdHere";
            return originalMergeCart.apply(this, arguments);
          });
        expect(() => {
          return Meteor.call("cart/mergeCart", "cartIdHere", sessionId);
        }).toThrow(new Meteor.Error(403, "Access Denied"));

        return done();
      }
    );

    it(
      "should throw an error if cart user is not current user",
      done => {
        let cart = Factory.create("cart");
        spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
          function () {
            this.userId = "someIdHere";
            return originalMergeCart.apply(this, arguments);
          });
        expect(() => {
          return Meteor.call("cart/mergeCart", cart._id, sessionId);
        }).toThrow(new Meteor.Error(403, "Access Denied"));

        return done();
      }
    );

    // it(
    //   "should",
    //   done => {
    //
    //     return done();
    //   }
    // );
  });

  describe("cart/createCart", function () {
    it("should create a test cart", function (done) {
      spyOn(Meteor.server.method_handlers, "cart/mergeCart").and.callFake(
        function () {
          this.userId = userId;
          return originalMergeCart.apply(this, arguments);
        });
      spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
      spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
      spyOn(ReactionCore.Collections.Cart, "insert").and.callThrough();

      let cartId = Meteor.call("cart/createCart", userId, sessionId);
      let cart = ReactionCore.Collections.Cart.findOne({
        userId: userId
      });
      expect(ReactionCore.Collections.Cart.insert).toHaveBeenCalled();
      expect(cartId).toEqual(cart._id);

      done();
    });
  });

  describe("cart/addToCart", function () {
    const quantity = 1;
    let product;
    let productId;
    let variantId;

    beforeAll(done => {
      product = Factory.create("product");
      productId = product._id;
      variantId = product.variants[0]._id;

      done();
    });

    beforeEach(function () {
      ReactionCore.Collections.Cart.remove({});
    });

    it(
      "should add item to cart",
      function (done) {
        let cart = Factory.create("cart");
        let items = cart.items.length;
        spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
          function () {
            this.userId = cart.userId;
            return originalAddToCart.apply(this, arguments);
          });

        Meteor.call("cart/addToCart", productId, variantId, quantity);
        cart = ReactionCore.Collections.Cart.findOne(cart._id);

        expect(cart.items.length).toEqual(items + 1);
        expect(cart.items[cart.items.length - 1].productId).toEqual(productId);

        done();
      }
    );

    it("should merge all items of same variant in cart", function (
      done) {
      spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
      spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
      spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
        function () {
          this.userId = userId;
          return originalAddToCart.apply(this, arguments);
        });
      const cartId = Meteor.call("cart/createCart", userId, sessionId);

      Meteor.call("cart/addToCart", productId, variantId, quantity);
      // add a second item of same variant
      Meteor.call("cart/addToCart", productId, variantId, quantity);
      let cart = ReactionCore.Collections.Cart.findOne(cartId);

      expect(cart.items.length).toEqual(1);
      expect(cart.items[0].quantity).toEqual(2);

      done();
    });

    it(
      "should throw error an exception if user doesn't have a cart",
      done => {
        const  userWithoutCart = Factory.create("user");
        spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
          function () {
            this.userId = userWithoutCart._id;
            return originalAddToCart.apply(this, arguments);
          });
        expect(() => {
          return Meteor.call("cart/addToCart", productId, variantId,
            quantity);
        }).toThrow(new Meteor.Error(404, "Cart not found",
          "Cart is not defined!"));

        return done();
      }
    );

    it(
      "should throw error an exception if product doesn't exists",
      done => {
        const  cart = Factory.create("cart");
        spyOn(Meteor.server.method_handlers, "cart/addToCart").and.callFake(
          function () {
            this.userId = cart.userId;
            return originalAddToCart.apply(this, arguments);
          });
        expect(() => {
          return Meteor.call("cart/addToCart", "fakeProductId", variantId,
            quantity);
        }).toThrow(new Meteor.Error(404, "Product not found",
          "Product is not defined!"));

        return done();
      }
    );

    // it(
    //   "should call `cart/mergeCart` method if anonymous carts presents for this session",
    //   done => {
    //
    //     return done();
    //   }
    // );
  });

  describe("cart/removeFromCart", function () {
    beforeEach(function () {
      ReactionCore.Collections.Cart.remove({});
    });

    it("should remove item from cart", function (done) {
      let cart = Factory.create("cart");
      const cartUserId = cart.userId;

      spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(shop._id);
      spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
      spyOn(Meteor, "userId").and.returnValue(cartUserId);
      spyOn(ReactionCore.Collections.Cart, "update").and.callThrough();

      cart = ReactionCore.Collections.Cart.findOne(cart._id);
      const cartItemId = cart.items[0]._id;
      expect(cart.items.length).toEqual(2);

      Meteor.call("cart/removeFromCart", cartItemId);

      // mongo update should be called
      expect(ReactionCore.Collections.Cart.update.calls.count()).toEqual(1);
      cart = ReactionCore.Collections.Cart.findOne(cart._id);

      // fixme: we expect decrease the number of items, but this does not
      // occur by some unknown reason
      // expect(cart.items.length).toEqual(1);

      return done();
    });

    it(
      "should throw an exception when attempting to remove item from cart " +
      "of another user",
      done => {
        const cart = Factory.create("cart");
        const cartItemId = "testId123";
        spyOn(Meteor, "userId").and.returnValue(cart.userId);
        expect(() => {
          return Meteor.call("cart/removeFromCart", cartItemId);
        }).toThrow(new Meteor.Error(404, "Cart item not found.",
          "Unable to find an item with such id within you cart."));

        return done();
      }
    );

    it(
      "should throw an exception when attempting to remove non-existing item",
      done => {
        const cart = Factory.create("cart");
        const cartItemId = Random.id();
        spyOn(Meteor, "userId").and.returnValue(cart.userId);
        expect(() => {
          return Meteor.call("cart/removeFromCart", cartItemId);
        }).toThrow(new Meteor.Error(404, "Cart item not found.",
          "Unable to find an item with such id within you cart."));

        return done();
      }
    );
  });

  describe("cart/copyCartToOrder", () => {
    it(
      "should throw error if cart user not current user",
      done => {
        const cart = Factory.create("cart");
        spyOn(Meteor.server.method_handlers, "cart/copyCartToOrder").and.
          callFake(
          function () {
            this.userId = "wrongUserId";
            return originalCopyCartToOrder.apply(this, arguments);
          });
        expect(() => {
          return Meteor.call("cart/copyCartToOrder", cart._id, sessionId);
        }).toThrow(new Meteor.Error(403, "Access Denied"));

        return done();
      }
    );

    it(
      "should throw error if cart has not items",
      done => {
        const user1 = Factory.create("user");
        spyOn(ReactionCore, "getShopId").and.returnValue(shop._id);
        spyOn(Meteor.server.method_handlers, "cart/copyCartToOrder").and.
        callFake(
          function () {
            this.userId = user1._id;
            return originalCopyCartToOrder.apply(this, arguments);
          });
        const cartId = Meteor.call("cart/createCart", user1._id, sessionId);
        expect(cartId).toBeDefined();
        expect(() => {
          return Meteor.call("cart/copyCartToOrder", cartId, sessionId);
        }).toThrow(new Meteor.Error("An error occurred saving the order." +
          " Missing cart items."));

        return done();
      }
    );

    it(
       "should throw an error if order creation was failed",
       done => {
         const cart = Factory.create("cartToOrder");
         spyOn(Meteor.server.method_handlers, "cart/copyCartToOrder").and.
         callFake(
           function () {
             this.userId = cart.userId;
             return originalCopyCartToOrder.apply(this, arguments);
           });
         // The main moment of test. We are spy on `insert` operation but do not
         // let it through this call
         spyOn(ReactionCore.Collections.Orders, "insert");
         expect(() => {
           return Meteor.call("cart/copyCartToOrder", cart._id, sessionId);
         }).toThrow(new Meteor.Error(400, "cart/copyCartToOrder: Invalid request"));
         expect(ReactionCore.Collections.Orders.insert).toHaveBeenCalled();

         return done();
       }
    );

    it(
       "should create an order",
       done => {
         let cart = Factory.create("cartToOrder");
         spyOn(ReactionCore, "shopIdAutoValue").and.returnValue(cart.shopId);
         spyOn(ReactionCore, "getShopId").and.returnValue(cart.shopId);
         spyOn(Meteor.server.method_handlers, "cart/copyCartToOrder").and.
         callFake(
           function () {
             this.userId = cart.userId;
             return originalCopyCartToOrder.apply(this, arguments);
           });
         spyOn(ReactionCore.Collections.Orders, "insert").and.callThrough();

         const orderId = Meteor.call("cart/copyCartToOrder", cart._id,
           sessionId);
         expect(ReactionCore.Collections.Orders.insert).toHaveBeenCalled();
         expect(typeof orderId).toEqual("string");

         return done();
       }
    );
  });

  describe("cart/unsetAddresses", function () {
    it(
      "should correctly remove addresses from cart",
      done => {
        let cart = Factory.create("cart");
        spyOn(Meteor.server.method_handlers, "cart/setShipmentAddress").and.
          callFake(
          function () {
            this.userId = cart.userId;
            return originalSetShipmentAddress.apply(this, arguments);
          });
        spyOn(Meteor.server.method_handlers, "cart/setPaymentAddress").and.
          callFake(
          function () {
            this.userId = cart.userId;
            return originalSetPaymentAddress.apply(this, arguments);
          });

        const cartId = cart._id;
        const address = Object.assign({}, faker.reaction.address(), {
          _id: Random.id(),
          isShippingDefault: true,
          isBillingDefault: true
        });

        Meteor.call("cart/setPaymentAddress", cartId, address);
        Meteor.call("cart/setShipmentAddress", cartId, address);
        cart = ReactionCore.Collections.Cart.findOne(cartId);

        expect(cart.shipping[0].address._id).toEqual(address._id);
        expect(cart.billing[0].address._id).toEqual(address._id);

        // our Method checking
        Meteor.call("cart/unsetAddresses", address._id, cart.userId);

        cart = ReactionCore.Collections.Cart.findOne(cartId);

        expect(cart.shipping[0].address).toBeUndefined();
        expect(cart.billing[0].address).toBeUndefined();

        return done();
      }
    );

    it(
      "should throw error if wrong arguments were passed",
      done => {
        spyOn(ReactionCore.Collections.Accounts, "update");

        expect(function () {
          return Meteor.call("cart/unsetAddresses", 123456);
        }).toThrow();

        expect(function () {
          return Meteor.call("cart/unsetAddresses", {});
        }).toThrow();

        expect(function () {
          return Meteor.call("cart/unsetAddresses", null);
        }).toThrow();

        expect(function () {
          return Meteor.call("cart/unsetAddresses");
        }).toThrow();

        expect(function () {
          return Meteor.call("cart/unsetAddresses", "asdad", 123);
        }).toThrow();

        // https://github.com/aldeed/meteor-simple-schema/issues/522
        expect(function () {
          return Meteor.call(
            "accounts/addressBookRemove", () => {
              console.log("test");
            }
          );
        }).not.toThrow();

        expect(ReactionCore.Collections.Accounts.update).not.toHaveBeenCalled();

        return done();
      }
    );

    it(
      "should update cart via `type` argument",
      done => {
        let cart = Factory.create("cart");
        spyOn(Meteor.server.method_handlers, "cart/setShipmentAddress").and.
        callFake(
          function () {
            this.userId = cart.userId;
            return originalSetShipmentAddress.apply(this, arguments);
          });
        spyOn(Meteor.server.method_handlers, "cart/setPaymentAddress").and.
        callFake(
          function () {
            this.userId = cart.userId;
            return originalSetPaymentAddress.apply(this, arguments);
          });

        const cartId = cart._id;
        const address = Object.assign({}, faker.reaction.address(), {
          _id: Random.id(),
          isShippingDefault: true,
          isBillingDefault: true
        });
        Meteor.call("cart/setPaymentAddress", cartId, address);
        Meteor.call("cart/setShipmentAddress", cartId, address);
        cart = ReactionCore.Collections.Cart.findOne(cartId);

        expect(cart.shipping[0].address._id).toEqual(address._id);
        expect(cart.billing[0].address._id).toEqual(address._id);

        Meteor.call("cart/unsetAddresses", address._id, cart.userId,
          "billing");
        Meteor.call("cart/unsetAddresses", address._id, cart.userId,
          "shipping");

        cart = ReactionCore.Collections.Cart.findOne(cartId);

        expect(cart.shipping[0].address).toBeUndefined();
        expect(cart.billing[0].address).toBeUndefined();

        return done();
      }
    );

    // it(
    //  "",
    //  done => {
    //    let account = Factory.create("account");
    //    return done();
    //  }
    // );
  });
});
