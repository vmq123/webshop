// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

// JS exclusive to /cart page
frappe.provide("webshop.webshop.shopping_cart");
var shopping_cart = webshop.webshop.shopping_cart;

$.extend(shopping_cart, {
	show_error: function(title, text) {
		$("#cart-container").html('<div class="msg-box"><h4>' +
			title + '</h4><p class="text-muted">' + text + '</p></div>');
	},

	bind_events: function() {
		shopping_cart.bind_empty_cart();
		shopping_cart.bind_place_order();
		shopping_cart.bind_request_quotation();
		shopping_cart.bind_change_qty();
		shopping_cart.bind_remove_cart_item();
		shopping_cart.bind_change_notes();
		shopping_cart.bind_coupon_code();
	},

	bind_empty_cart: function() {
		$(".btn-empty-cart").on("click", function() {
			shopping_cart.empty_cart(this);
		});
	},

	bind_place_order: function() {
		$(".btn-place-order").on("click", function() {
			shopping_cart.place_order(this);
		});
	},

	bind_request_quotation: function() {
		$('.btn-request-for-quotation').on('click', function() {
			shopping_cart.request_quotation(this);
		});
	},

	bind_change_qty: function() {
		// bind update button
		$(".cart-items").on("change", ".cart-qty", function() {
			var item_code = $(this).attr("data-item-code");
			var newVal = $(this).val();
			shopping_cart.shopping_cart_update({item_code, qty: newVal});
		});

		$(".cart-items").on('click', '.number-spinner button', function () {
			var btn = $(this),
				input = btn.closest('.number-spinner').find('input'),
				oldValue = input.val().trim(),
				newVal = 0;

			if (btn.attr('data-dir') == 'up') {
				newVal = parseInt(oldValue) + 1;
			} else {
				if (oldValue > 1) {
					newVal = parseInt(oldValue) - 1;
				}
			}
			input.val(newVal);

			let notes = input.closest("td").siblings().find(".notes").text().trim();
			var item_code = input.attr("data-item-code");
			shopping_cart.shopping_cart_update({
				item_code,
				qty: newVal,
				additional_notes: notes
			});
		});
	},

	bind_change_notes: function() {
		$('.cart-items').on('change', 'textarea', function() {
			const $textarea = $(this);
			const item_code = $textarea.attr('data-item-code');
			const qty = $textarea.closest('tr').find('.cart-qty').val();
			const notes = $textarea.val();
			shopping_cart.shopping_cart_update({
				item_code,
				qty,
				additional_notes: notes
			});
		});
	},

	bind_remove_cart_item: function() {
		$(".cart-items").on("click", ".remove-cart-item", (e) => {
			const $remove_cart_item_btn = $(e.currentTarget);
			var item_code = $remove_cart_item_btn.data("item-code");

			shopping_cart.shopping_cart_update({
				item_code: item_code,
				qty: 0
			});
		});
	},

	render_tax_row: function($cart_taxes, doc, shipping_rules) {
		var shipping_selector;
		if(shipping_rules) {
			shipping_selector = '<select class="form-control">' + $.map(shipping_rules, function(rule) {
				return '<option value="' + rule[0] + '">' + rule[1] + '</option>' }).join("\n") +
			'</select>';
		}

		var $tax_row = $(repl('<div class="row">\
			<div class="col-md-9 col-sm-9">\
				<div class="row">\
					<div class="col-md-9 col-md-offset-3">' +
					(shipping_selector || '<p>%(description)s</p>') +
					'</div>\
				</div>\
			</div>\
			<div class="col-md-3 col-sm-3 text-right">\
				<p' + (shipping_selector ? ' style="margin-top: 5px;"' : "") + '>%(formatted_tax_amount)s</p>\
			</div>\
		</div>', doc)).appendTo($cart_taxes);

		if(shipping_selector) {
			$tax_row.find('select option').each(function(i, opt) {
				if($(opt).html() == doc.description) {
					$(opt).attr("selected", "selected");
				}
			});
			$tax_row.find('select').on("change", function() {
				shopping_cart.apply_shipping_rule($(this).val(), this);
			});
		}
	},

	apply_shipping_rule: function(rule, btn) {
		return frappe.call({
			btn: btn,
			type: "POST",
			method: "webshop.webshop.shopping_cart.cart.apply_shipping_rule",
			args: { shipping_rule: rule },
			callback: function(r) {
				if(!r.exc) {
					shopping_cart.render(r.message);
				}
			}
		});
	},

	empty_cart: function(btn) {
		shopping_cart.freeze();
		frappe.confirm(
			__('Bạn chắc chắn muốn xóa giỏ hàng?'),
			() => {
				// Action if "Yes" is clicked
				frappe.call({
					type: "POST",
					method: "touropt.controllers.webshop_cart.empty_cart_for_cart_id",
					args: {
						webshop_cart_id: frappe.get_cookie("webshop_cart_id")
					},
					btn: btn,
					callback: function(r) {
						if(r.exc) {
							shopping_cart.unfreeze();
							var msg = "";
							if(r._server_messages) {
								msg = JSON.parse(r._server_messages || []).join("<br>");
							}

							$("#cart-error")
								.empty()
								.html(msg || frappe._("Something went wrong!"))
								.toggle(true);
							window.location.href = '/all-products';
						} else {
							$(btn).hide();
							window.location.href = '/all-products';
						}
					}
				});
			},
			() => {
				shopping_cart.unfreeze();
			}
		);
	},

	place_order: function(btn) {
		if (frappe.get_cookie("webshop_sq_name")!=null) {
			shopping_cart.freeze();
			frappe.require(['/assets/webshop/js/webshop_place_order_3_steps.js'], () => {
				const d = place_order_dialog(btn)
				d.show();
			});
		} else {
			window.location.href = '/all-products';
		}
	},

	request_quotation: function(btn) {
		shopping_cart.freeze();

		return frappe.call({
			type: "POST",
			method: "webshop.webshop.shopping_cart.cart.request_for_quotation",
			btn: btn,
			callback: function(r) {
				if(r.exc) {
					shopping_cart.unfreeze();
					var msg = "";
					if(r._server_messages) {
						msg = JSON.parse(r._server_messages || []).join("<br>");
					}

					$("#cart-error")
						.empty()
						.html(msg || frappe._("Something went wrong!"))
						.toggle(true);
				} else {
					$(btn).hide();
					window.location.href = '/quotations/' + encodeURIComponent(r.message);
				}
			}
		});
	},

	bind_coupon_code: function() {
		$(".bt-coupon").on("click", function() {
			shopping_cart.apply_coupon_code(this);
		});
	},

	apply_coupon_code: function(btn) {
		return frappe.call({
			type: "POST",
			method: "webshop.webshop.shopping_cart.cart.apply_coupon_code",
			btn: btn,
			args : {
				applied_code : $('.txtcoupon').val(),
				applied_referral_sales_partner: $('.txtreferral_sales_partner').val()
			},
			callback: function(r) {
				if (r && r.message){
					location.reload();
				}
			}
		});
	}
});

frappe.ready(function() {
	if (window.location.pathname === "/cart") {
		$(".cart-icon").hide();
	}
	shopping_cart.parent = $(".cart-container");
	shopping_cart.bind_events();
});

function show_terms() {
	var html = $(".cart-terms").html();
	frappe.msgprint(html);
};

function place_order_dialog(){
	let current_step = 1;
	let d = new frappe.ui.Dialog({
		title: __('Customer Information'),
		fields: [
			// --- STEP 1 FIELDS ---
			{
				label: __('Full Name'),
				fieldname: 'full_name',
				fieldtype: 'Data',
				reqd: 1
			},
			{
				label: __('Phone Number'),
				fieldname: 'phone_number',
				fieldtype: 'Data'
			},
			// --- STEP 2 FIELDS (Hidden initially) ---
			{
				fieldtype: 'Section Break',
				fieldname: 'step_2_section',
				hidden: 1
			},
			{
				label: __('Payment instruction'),
				fieldname: 'payment_instruction_html',
				fieldtype: 'HTML',
				options: `
					<div style="text-align: center;">
						<img src="/files/Company_QR_01.png" style="width: 200px; margin-bottom: 10px;">
						<h4>Please scan for payment</h4>
						<p>Then press OK</p>
					</div>
				`,
				hidden: 1
			}
		],
		primary_action_label: 'Next',
		primary_action: () => {
			if (current_step === 1) {
				// Logic for Step 1 -> Step 2
				d.set_df_property('full_name', 'hidden', 1);
				d.set_df_property('phone_number', 'hidden', 1);

				// 2. Show Step 2 Fields
				d.set_df_property('step_2_section', 'hidden', 0);
				d.set_df_property('payment_instruction_html', 'hidden', 0);

				// 3. Update Dialog UI
				d.set_title(__('Payment instruction'));
				// d.set_primary_action_label('OK');
				current_step = 2;
				d.set_primary_action('OK', function(values) {
					// frappe.utils.set_cookie("cart_count", "", -1);
					frappe.call({
						type: "POST",
						method: "touropt.controllers.webshop_cart.place_order_for_cart_id",
						args: {
							webshop_cart_id: frappe.get_cookie("webshop_cart_id"),
							full_name: values.full_name,
							phone_number: values.phone_number
						},
						// btn: btn,
						freeze: true,
						callback: function(r) {
							if(r.exc) {
								shopping_cart.unfreeze();
								var msg = "";
								if(r._server_messages) {
									msg = JSON.parse(r._server_messages || []).join("<br>");
								}

								$("#cart-error")
									.empty()
									.html(msg || frappe._("Something went wrong!"))
									.toggle(true);
							} else {
								// $(btn).hide();
								shopping_cart.unfreeze();
								d.hide();
								// window.location.href = '/orders/' + encodeURIComponent(r.message);
								frappe.call('webshop.webshop.api.get_guest_redirect_on_action').then((res) => {
									window.location.href = res.message || "/all-products";
								});
							}
						}
					});
				});
			} else {
				shopping_cart.unfreeze();
				d.hide();
			}
		},
		secondary_action_label: __('Cancel'),
		secondary_action() {
			shopping_cart.unfreeze();
			d.hide();
		}
	});
	return d;
};