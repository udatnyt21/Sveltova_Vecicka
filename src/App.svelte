<script>
	let name = "me";

	let fields = ["", "", "", "", "", "", "", "", ""]

	function changeField(e){
		let index = e.target.getAttribute("id")
		fields[index] = "X"
		console.log(fields)
	}

</script>

<main>
	<h1>Velmi cool piškvorky, made by {name}</h1>
	<table>
		<tr>
			<button id="0" on:click={changeField} >{fields[0]}</button> <button id="1" on:click={changeField}>{fields[1]}</button> <button id="2" on:click={changeField}>{fields[2]}</button>
		</tr>
		<tr>
			<button id="3" on:click={changeField}>{fields[3]}</button> <button id="4" on:click={changeField}>{fields[4]}</button> <button id="5" on:click={changeField}>{fields[5]}</button>
		</tr>
		<tr>
			<button id="6" on:click={changeField}>{fields[6]}</button> <button id="7" on:click={changeField}>{fields[7]}</button> <button id="8" on:click={changeField}>{fields[8]}</button>
		</tr>
	</table>
</main>

<style>
	h1{
		text-align: center;
	}

	button{
		width: 50px;
		height: 50px;
	}

	/**table,
	th,
	tr {
		text-align: center;
		border: 2px solid black;
		width: 250px;
		height: 75px;
		border-collapse: collapse;
	}
	**/

</style>