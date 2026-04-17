let current_step = 1;
function place_order_dialog(e){
	// const $btn = $(e.target);
	// const grand_total = $btn.data('grand-total');
	current_step = 1;
	let d = new frappe.ui.Dialog({
		title: __('Đặt hàng 1/4'),
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
			// --- STEP 2 FIELDS (Hidden initially) ---
			{ fieldtype: 'Section Break', fieldname: 'step_2_section', label: __('Vui lòng thanh toán 50% giá trị đơn hàng để đặt cọc'), hidden: 1 },
			{
				label: __('Tài khoản nhận đặt cọc'),
				fieldname: 'payment_instruction_html',
				fieldtype: 'HTML',
				options: `
					<div style="text-align: center;">
						<p>Tài khoản nhận tiền</p>
						<img src="/files/Company_QR_02.png" style="width: 200px; margin-bottom: 1px;">
					</div>
				`
			},
			{
				label: __('Số tiền đặt cọc'),
				fieldname: 'proposed_payment_1_amount',
				fieldtype: 'HTML',
				options: '<div class="text-muted">Loading data...</div>' 
			},
			{
				label: __(''),
				fieldname: 'payment_instruction_html_2',
				fieldtype: 'HTML',
				options: `
					<div style="text-align: center;">
						<p>Sau khi thanh toán xong, hãy bấm Tiếp</p>
					</div>
				`
			},
			// --- STEP 3 FIELDS (Hidden initially) ---
			{ fieldtype: 'Section Break', fieldname: 'step_3_section', label: __(''), hidden: 1 },
			{
				label: __('Tên các hành khách'),
				fieldname: 'passenger_names',
				fieldtype: 'Small Text'
				// reqd: 1,
			},
			{
				label: __('Mã giới thiệu - nếu có'),
				fieldname: 'referal_code',
				fieldtype: 'Data'
			},
			// --- STEP 4 FIELDS (Hidden initially) ---
			{ fieldtype: 'Section Break', fieldname: 'step_4_section', label: __('Đã xong'), hidden: 1 },
			{ 
				fieldtype: 'HTML', 
				fieldname: 'server_response_html', 
				options: '<div class="text-muted">Loading data...</div>' 
			}
		],
		primary_action_label: __('Tiếp theo'),
		primary_action: (values) => {
			console.log("current_step:", current_step);
			console.log("values:", values);
			let passenger_names = values.passenger_names || 'None'
			let referal_code = values.referal_code || 'None'
			if (current_step == 3){
				frappe.call({
					type: "POST",
					method: "touropt.controllers.webshop_cart.place_order_for_cart_id",
					args: {
						webshop_cart_id: frappe.get_cookie("webshop_cart_id"),
						// webshop_cart_id: localStorage.getItem("webshop_cart_id"),
						full_name: values.full_name,
						phone_number: values.phone_number,
						passenger_names: passenger_names,
						referal_code: referal_code
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
							// shopping_cart.unfreeze();
							// d.hide();
							// window.location.href = '/orders/' + encodeURIComponent(r.message);
							// frappe.call('webshop.webshop.api.get_guest_redirect_on_action').then((res) => {
							// 	window.location.href = res.message || "/all-products";
							// });
							d.set_df_property('server_response_html', 'options', `
								<div class="alert alert-info">
									<p>${r.message}</p>
								</div>
							`);
							localStorage.removeItem('webshop_cart_id');
							update_step(d,4); // Move to Step 4 after data is ready
						}
					}
				});
			} else if (current_step == 4) {
            	shopping_cart.unfreeze();
				d.hide();
				frappe.call('webshop.webshop.api.get_guest_redirect_on_action').then((res) => {
					window.location.href = res.message || "/all-products";
				});
			} else {
				if (current_step == 1) {
					frappe.call({
						type: "POST",
						method: "touropt.controllers.webshop_cart.propose_payment_1_amount_for_cart_id",
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
								console.log(r.message)
								d.set_df_property('payment_instruction_html','options', `
									<div class="alert alert-info">
										<p>${r.message.payment_instruction}</p>
									</div>
								`);
								d.set_df_property('proposed_payment_1_amount','options', `
									<div class="alert alert-info">
										<p>${r.message.payment_1}</p>
									</div>
								`);
							}
						}
					});
				} 
				update_step(d,current_step + 1);
	
			}
		},
		secondary_action_label: __('Hủy'),
		secondary_action() {
			shopping_cart.unfreeze();
			d.hide();
		}
	});
	d.get_close_btn().toggle(false); 
	if (frappe.session.user !== 'Guest') {
		d.set_value('referal_code', frappe.session.user);
	}
	return d;
};
function update_step(d,step) {
    current_step = step;
    d.set_title(__('Đặt hàng')+" "+step+"/4");
    // Toggle Sections
    d.set_df_property('step_1_section', 'hidden', step !== 1);
    d.set_df_property('step_2_section', 'hidden', step !== 2);
    d.set_df_property('step_3_section', 'hidden', step !== 3);
	d.set_df_property('step_4_section', 'hidden', step !== 4);
    // Update Buttons
    d.get_primary_btn().text(step === 4 ? __('Xong') : __('Tiếp '));
	if (step == 4){
		d.get_secondary_btn().hide();
	}
};