<script>
	let crossTurn = true
	let ending = ""
	let finish = false

	let fields = [
    ["", "", ""].slice(),
    ["", "", ""].slice(),
    ["", "", ""].slice()
	]


	function changeField(e){
		if (finish)
			return


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

	function checkWinner() {
		// horizontal
		for (let i = 0; i < 3; i++) {
			if (fields[i][0] !== "" && fields[i][0] === fields[i][1] && fields[i][1] === fields[i][2]) {
				announceWinner(fields[i][0]);
				return;
			}}
		// vertical
		for (let j = 0; j < 3; j++) {
			if (fields[0][j] !== "" && fields[0][j] === fields[1][j] && fields[1][j] === fields[2][j]) {
				announceWinner(fields[0][j]);
				return;
			}}
		//diagonal
    	if (fields[0][0] !== "" && fields[0][0] === fields[1][1] && fields[1][1] === fields[2][2]) {
			announceWinner(fields[0][0]);
			return;
		}
		//diagonal
		if (fields[0][2] !== "" && fields[0][2] === fields[1][1] && fields[1][1] === fields[2][0]) {
			announceWinner(fields[0][2]);
			return;
		}

    let draw = true;
    for (let row of fields) {
        for (let cell of row) {
            if (cell === "") {
                draw = false;
                break;
            }
        }
        if (!draw) break;
    	}
    if (draw){
		console.log("Draw")
		finish = true
		}
		
	}

	function announceWinner(winner) {
		console.log(winner);
		ending = "Winner is " + winner
		finish = true
	}

	function resetGame() {
		finish = false
		ending = ""
		for(let i=0; i<3; i++)
			for(let j=0;j<3;j++)
				fields[i][j] = ""
	}


</script>
<head>
	<link rel="stylesheet" href="style.css">
</head>

<main>
	<h1>Velmi cool piškvorky</h1>
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
	{#if finish}
		<button on:click={resetGame}>Reset</button>
	{/if}
</main>