let current_step = 1;
function place_order_case_1_dialog(e){
	const $btn = $(e.target);
	// const amount = $btn.data('amount');
	// const grand_total = $btn.data('grand-total');
	const amount = $(".txtcustom_remaining_payment_amount").val();
	const grand_total = $(".txtgrand_total").val();
	const txtcustom_require_passenger_name = $(".txtcustom_require_passenger_name").val();

	console.log("amount="+amount)
	console.log("grand_total="+grand_total)
	console.log("txtcustom_require_passenger_name="+txtcustom_require_passenger_name)
	// let seven_days_later = frappe.datetime.add_days(frappe.datetime.nowdate(), 7);
	// let seven_days_later=new Date()
	current_step = 1;
	let d = new frappe.ui.Dialog({
		title: __('Nhận thanh toán'),
		fields: [
			// --- STEP 1 FIELDS ---
			{ fieldtype: 'Section Break', fieldname: 'step_1_section', label: __(''), hidden: 0 },
			{
				label: __('Số tiền khách thanh toán'),
				fieldname: 'amount_received',
				fieldtype: 'Currency',
				options: 'VND',
				default: amount,
				reqd: 1
			},
			{
				label: __(''),
				fieldname: 'txtcustom_require_passenger_name',
				fieldtype: 'Int',
				default: txtcustom_require_passenger_name,
				hidden: 1
			},
			{
				label: __(''),
				fieldname: 'grand_total',
				fieldtype: 'Currency',
				options: 'VND',
				default: grand_total,
				hidden: 1
			},
			{
				label: __('Mã giới thiệu - nếu có'),
				fieldname: 'referal_code',
				fieldtype: 'Data'
			},
			// --- STEP 2 FIELDS (Hidden initially) ---
			{ fieldtype: 'Section Break', fieldname: 'step_2_section', label: __(''), hidden: 1 },
			{
				label: __('Remaining payment date'),
				fieldname: 'remaining_payment_date',
				fieldtype: 'Data',
				placeholder: 'YYYY-MM-DD'
				// default: seven_days_later,
			},
			// --- STEP 3 FIELDS (Hidden initially) ---
			{ fieldtype: 'Section Break', fieldname: 'step_3_section', label: __(''), hidden: 1 },
			{
				label: __('Tên các hành khách'),
				fieldname: 'passenger_names',
				fieldtype: 'Small Text'
				// reqd: 1,
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
			if (current_step == 4) {
            	shopping_cart.unfreeze();
				d.hide();
				frappe.call('webshop.webshop.api.get_guest_redirect_on_action').then((res) => {
					window.location.href = res.message || "/all-products";
				});
			} else {
				update_step(d,current_step+1,values);
			}
		},
		secondary_action_label: __('Hủy'),
		secondary_action() {
			shopping_cart.unfreeze();
			d.hide();
		}
	});
	d.get_close_btn().toggle(false); 
	d.get_field('remaining_payment_date').$input.datepicker({
		language: 'en',
		dateFormat: 'yyyy-mm-dd',
		autoClose: true
	});
	// Set manual "today + 7" default here
	let future_date = new Date();
	future_date.setDate(future_date.getDate() + 7);
	let date_string = future_date.toISOString().split('T')[0];
	d.set_value('remaining_payment_date', date_string);
	d.set_value('referal_code', frappe.session.user)

	return d;
};
function update_step(d,step,values) {
	if (step == 2){
		if (values.amount_received >= values.grand_total) {
			step = 3;
			console.log("goto step 3")
		} else {
			console.log("need step 2")
		}
	}
	if (step == 3){
		if (values.txtcustom_require_passenger_name==0) {// check if not have tour-item in the order
			step = 4;
			console.log("goto step 4")
		} else {
			console.log("need step 3")
		}
	} 
	if (step == 4){
		confirm_place_order(d, values);
		console.log("called confirm_place_order")
	}
    current_step = step;
    // d.set_title(__('Đặt hàng')+" "+step+"/3");
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
function confirm_place_order(d, values) {
	frappe.call({
		type: "POST",
		method: "touropt.controllers.webshop_cart.confirm_place_order_for_cart_id",
		args: {
			webshop_cart_id: frappe.get_cookie("webshop_cart_id"),
			case: 1,
			values: values
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
				d.set_df_property('server_response_html', 'options', `
					<div class="alert alert-info">
						<p>${r.message.result}</p>
					</div>
				`);
				$(".payment-request").html(r.message.payment_request);
			}
		}
	});
};