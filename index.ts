interface ConEntryDict {
    [key: number]: ConEntry | undefined
}
class ConEntry {
    displayName: string;
    isFolder: boolean;
    number: number;
    parent: number;
    database: string;
    username: string;
    password: string;
    constructor(displayName: string) {
        this.displayName = displayName;
        this.isFolder = false;
        this.number = -1;
        this.parent = -1;
        this.database = '';
        this.username = '';
        this.password = '';
    }
    getHierarchicalName(parentMap: ConEntryDict) {
        const l = new Array<string>();
        let pn = this.parent;
        while (pn > -1) {
            const p = parentMap[pn]!;
            l.push(p?.displayName);
            pn = p.parent;
        }
        return `${l.reverse().join('.')}.${this.displayName}`;
    }
    decodePassword(): string {
        const values = new Array<number>();
        let ret = '';
        for (var i = 0; i < this.password.length; i += 4) {
            values.push(Number.parseInt(this.password.substring(i, i + 4)));
        }
        const key = values.shift()!;
        for (var i = 0; i < values.length; ++i) {
            ret += String.fromCharCode(((values[i] - 1000) ^ (key + (10 * (i + 1)))) >> 4);
        }
        return ret;
    }

    toVscodeOraConTemplate(name: string, tnsAdmin: string): string {
        return `{
    'authenticationType': 2,
    'dBAPrivilege': 'None',
    'userID': '${this.username}',
    'passwordSaved': true,
    'password': '${this.decodePassword()}',
    'dataSource': '${this.database}',
    'connectionType': 1,
    'tnsAdmin': '${tnsAdmin}',
    'useConnectionCredsFromWalletFile': false,
    'name': '${name}',
    'color': 'none',
    'currentSchema': '',
    'addSettingsScopeToConnectionName': false,
    'addCurrentSchemaToConnectionName': false,
    'filters': [],
    'useCompatibleNamesDirectoryPath': true,
    'passwordStore': 'Settings'
}`;
    }
}

function convertPlSqlConList(plsqlCons: string | undefined, tnsNamesOraLocation: string): string {
    const DISPLAYNAME: string = 'DisplayName';
    const ISFOLDER: string = 'IsFolder';
    const NUMBER: string = 'Number';
    const PARENT: string = 'Parent';
    const DATABASE: string = 'Database';
    const USERNAME: string = 'Username';
    const PASSWORD: string = 'Password';

    if (plsqlCons) {
        const lines = plsqlCons.split(/\r?\n/);
        const cons = new Array<ConEntry>();
        for (let i = 0; i < lines.length;) {
            let ce: ConEntry | null = null;
            do {
                let l = lines[i].split('=');
                switch (l[0]) {
                    case DISPLAYNAME:
                        ce = new ConEntry(l[1]);
                        break;
                    case ISFOLDER:
                        ce!.isFolder = l[1] === '1';
                        break;
                    case NUMBER:
                        ce!.number = Number.parseInt(l[1]);
                        break;
                    case PARENT:
                        ce!.parent = Number.parseInt(l[1]);
                        break;
                    case DATABASE:
                        if (l.length > 1) {
                            ce!.database = l[1];
                        }
                        break;
                    case USERNAME:
                        if (l.length > 1) {
                            ce!.username = l[1];
                        }
                        break;
                    case PASSWORD:
                        if (l.length > 1) {
                            ce!.password = l[1];
                        }
                        break;
                }
            }while (++i < lines.length && !lines[i].startsWith(DISPLAYNAME));
            cons.push(ce!);
        }
        var d: ConEntryDict = {};
        cons.sort((a, b) => a.number === b.number
            ? Math.sign(a.parent - b.parent)
            : Math.sign(a.number - b.number))
            .forEach((e) => d[e.number] = e);
        const objs = cons.filter(function (c) {
            return c.database;
        })
            .map((c) => c.toVscodeOraConTemplate(c.getHierarchicalName(d), tnsNamesOraLocation)).join(',\n');
        return `[${objs}]`
    }
    return '';
}
(function () {
    const btnConvert = document.getElementById('btnConvert') as HTMLButtonElement | null;
    const txtTnsNamesOra = document.getElementById('txtTnsNamesOra') as HTMLInputElement | null;
    const txtPlsqlCons = document.getElementById('txtPlsqlCons') as HTMLTextAreaElement | null;
    const txtVscodeCons = document.getElementById('txtVscodeCons') as HTMLTextAreaElement | null;
    btnConvert?.addEventListener('click', (e) => {
        if (txtVscodeCons) {
            let t = txtTnsNamesOra?.value;
            if (!t) {
                t = '__';
            }
            txtVscodeCons.value = convertPlSqlConList(txtPlsqlCons?.value, t);
        }
    });
})()
