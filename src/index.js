var requestify = require("requestify");
const cheerio = require('cheerio')
const { Client } = require('pg')
const client = new Client()

function getMenorPreco(array){
    let max = array.reduce(function(a, b) {
        return Math.min(a, b);
    });
    return max

}

function getArrayPrecos(string, index = 1){
    const regexPreco = /R\$ (\d+,\d+)/g;

    let matches = [];
    let match;
    while (match = regexPreco.exec(string)) {
        matches.push(parseFloat(match[index].replace(',','.')));
    }
    return matches;
}

/*create table preco (
	ds_url varchar(200) not null,
	ds_produto varchar(400) not null,
	tp_site varchar(20) not null,
	vl_preco real not null,
	dh_extracao timestamp without time zone not null default now()
)

variáveis de ambiente
PGHOST
PGPORT
PGDATABASE
PGUSER
PGPASSWORD
*/

function getInsert(link, descr, site, preco){
    return {
        text: `
        INSERT INTO preco (
            ds_url,
            ds_produto, 
            tp_site, 
            vl_preco
        ) values ($1, $2, $3, $4) `,
        values: [
            link, descr, site, preco
        ]
    }
}

(async function (){


    try {
        await client.connect()
        for (let ii = 12104870; ii < 99999999; ii++){
            let promises = [];
            for (let i = 0; i < 9; i++) {
                let link = "https://www.americanas.com.br/produto/" + ii +('0'+i).substring((i+'').length);
                promises.push (requestify.get(link)
                    .then( (response) => {
                        console.log('Sucesso ', link)
                        const $ = cheerio.load(response.body)
                        const preco = getMenorPreco(getArrayPrecos($('p.sales-price').text() + $('strong.payment-option-price').text() + $('span.sales-price').text()))
                        const descr = $('h1.product-name').text()

                        const res = client.query(getInsert(link, descr, 'AMERICANAS', preco))

                    })
                    .fail((err) => {
                        console.error('Falhou ', link)
                    }))
            }
            await Promise.all(promises)
        }
    } finally {
        await client.end()
    }

})()