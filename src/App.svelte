<script>
	let name = "me";

	let crossTurn = true
	let ending = ""

	let fields = [
    ["", "", ""].slice(),
    ["", "", ""].slice(),
    ["", "", ""].slice()
	]

	function checkWinner(){
		for(let i in fields)
			if (fields[i] == "")
				return
	}

	function changeField(e){
		let position = e.target.getAttribute("class").split(" ")[0].split(",")
		const x = parseInt(position[0])
    	const y = parseInt(position[1])
		console.log(x,y)

		if (fields[x][y] != "")
			return

		if (crossTurn)
			fields[x][y] = "X"
		else
			fields[x][y] = "O"
		crossTurn = !crossTurn


		checkWinner()
	}

</script>

<main>
	<h1>Velmi cool piškvorky, made by {name}</h1>
	<table>
		<tr>
			<button class="0,0" on:click={changeField} >{fields[0][0]}</button> <button class="0,1" on:click={changeField}>{fields[0][1]}</button> <button class="0,2" on:click={changeField}>{fields[0][2]}</button>
		</tr>
		<tr>
			<button class="1,0" on:click={changeField}>{fields[1][0]}</button> <button class="1,1" on:click={changeField}>{fields[1][1]}</button> <button class="1,2" on:click={changeField}>{fields[1][2]}</button>
		</tr>
		<tr>
			<button class="2,0" on:click={changeField}>{fields[2][0]}</button> <button class="2,1" on:click={changeField}>{fields[2][1]}</button> <button class="2,2" on:click={changeField}>{fields[2][2]}</button>
		</tr>
	</table>
	<h2>{ending}</h2>
</main>

<style>
	h1, h2{
		text-align: center;
	}

	button{
		vertical-align: top;
		width: 50px;
		height: 50px;
	}

	table{
		margin: 0 auto;
	}

</style>