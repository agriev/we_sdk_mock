import gender_guesser.detector as gender
import gender_predictor

_gp = None
_gd = None

gd_values = {
    'male': 'm',
    'female': 'f',
    'mostly_male': 'm',
    'mostly_female': 'f',
    'andy': 'u',
    'unknown': 'u',
}


def gp_value(value: str):
    return value.lower()


def gd_value(value: str):
    return gd_values[value]


def detect_gender(name: str):
    global _gp, _gd
    if not _gp or not _gd:
        gender_predictor.PATH = '/tmp/'
        gender_predictor.URL = 'https://github.com/mohammed-fazeel/gender-predictor/raw/master/names.zip'
        _gp = gender_predictor.GenderPredictor()
        _gp.train_and_test()
        _gd = gender.Detector()

    gp_result = gp_value(_gp.classify(name))
    gd_result = gd_value(_gd.get_gender(name))
    if gp_result != gd_result and gd_result != 'u':
        return gd_result
    return gp_result
