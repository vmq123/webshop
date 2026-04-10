# Copyright (c) 2021, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

no_cache = 1

from touropt.controllers.webshop_cart import get_cart_quotation_for_cart_id
from webshop.webshop.shopping_cart.cart import get_cart_quotation

import frappe

def get_context(context):
	context.body_class = "product-page"
	webshop_cart_id = frappe.form_dict.get("webshop_cart_id",frappe.request.cookies.get("webshop_cart_id"))
	# if webshop_cart_id is null then redirect to /all-products page
	if not webshop_cart_id:
		frappe.local.flags.redirect_location = "/all-products"
		raise frappe.Redirect
	else:
		frappe.local.cookie_manager.set_cookie("webshop_cart_id", webshop_cart_id)
	context.update(get_cart_quotation_for_cart_id(webshop_cart_id))
	# if frappe.session.user == "Guest":

	# else:
	# 	context.update(get_cart_quotation())
