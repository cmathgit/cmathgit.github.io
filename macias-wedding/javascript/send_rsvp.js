document.getElementById("yes-go").addEventListener("click", async () => {
	document.getElementById("our-response").textContent = "Thank you! See you soon"
	document.getElementById("no-go").disabled = true
	await new Promise(resolve => setTimeout(resolve, 1500));
	document.getElementById("id01").style.display = "none"
	document.getElementById("no-go").disabled = false

	//sendEmail("YES - Will Attend", document.getElementById("user_response").value)
	document.getElementById("rsvp").style.display = "none"
})

document.getElementById("no-go").addEventListener("click", async () => {
	document.getElementById("our-response").textContent = "Sorry to hear that! Hope to see you soon"
	document.getElementById("yes-go").disabled = true
	await new Promise(resolve => setTimeout(resolve, 1500));
	document.getElementById("id01").style.display = "none"
	document.getElementById("yes-go").disabled = false

	//sendEmail("NO - Will Not Attend", document.getElementById("user_response").value)
	document.getElementById("rsvp").style.display = "none"
})