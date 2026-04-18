frappe.ready(() => {
	const d = new frappe.ui.Dialog({
		title: __('Liên hệ'),
		fields: [
			// --- STEP 1 FIELDS ---
			{ fieldtype: 'Section Break', fieldname: 'step_1_section', label: __('Khách đặt hàng') },
			{
				label: __('Họ tên'),
				fieldname: 'full_name',
				fieldtype: 'Data',
				reqd: 1
			},
			{
				label: __('Số điện thoại'),
				fieldname: 'phone_number',
				fieldtype: 'Data',
				reqd: 1
			},
			{
				label: __('Lời nhắn - nếu có'),
				fieldname: 'message',
				fieldtype: 'Small Text'
				// reqd: 1,
			},
			{
				label: __('Ref_link'),
				fieldname: 'ref_link',
				fieldtype: 'Data',
				hidden: 1
			},
		],
		primary_action_label: __('Gửi'),
		primary_action: (values) => {
			console.log("values:", values);
			let message = values.message || 'None'
			frappe.call({
				type: "POST",
				method: "utilplus.controllers.lead_api.save_contact_us_response",
				args: {
					full_name: values.full_name,
					mobile_number: values.phone_number,
					ref_link: values.ref_link,
					doc_type: "Website Item",
					message: message
				},
				// btn: btn,
				freeze: true,
				callback: function(r) {
					if(r.exc) {
						// shopping_cart.unfreeze();
						var msg = "";
						if(r._server_messages) {
							msg = JSON.parse(r._server_messages || []).join("<br>");
						}

						$("#cart-error")
							.empty()
							.html(msg || frappe._("Something went wrong!"))
							.toggle(true);
					} else {
						// d.set_df_property('server_response_html', 'options', `
						// 	<div class="alert alert-info">
						// 		<p>${r.message}</p>
						// 	</div>
						// `);
						// shopping_cart.unfreeze();
						d.hide();
						frappe.msgprint(r.message)
					}
				}
			});
		},
		secondary_action_label: __('Hủy'),
		secondary_action() {
			// shopping_cart.unfreeze();
			d.hide();
		}
	});
	
	$('.btn-inquiry').click((e) => {
		const $btn = $(e.target);
		const item_code = $btn.data('item-code');
		let product_title = $('.product-title').text().trim()
		if (product_title == null) {
			product_title = 'sản phẩm';
		}
		d.set_value('ref_link', item_code);
		d.set_value('message', 'Mình quan tâm đến '+product_title+' này, hãy gọi lại cho mình nhé. Cảm ơn');
		d.get_close_btn().toggle(false); 
		d.show();
	});
});