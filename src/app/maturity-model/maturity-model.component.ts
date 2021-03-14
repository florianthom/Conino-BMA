import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  CreateUserMaturityModelGQL,
  MaturityModel,
  MaturityModelGQL,
  PartialModel,
  ProjectsOfUserGQL,
  UserEvaluationMetric,
  UserMaturityModel,
  UserMaturityModelOfUserGQL,
  UserPartialModel
} from "../graphql/generated/graphql";
import { map } from "rxjs/operators";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { ID_OF_MATURITYMODEL } from "../shared/constants/constants";
import {
  InputMaturityModelSpiderChart,
  InputSubUserPartialModelSpiderChart,
  InputUserPartialModelSpiderChart
} from "../shared/models/InputMaturityModelSpiderChart";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup
} from "@angular/forms";
import { Apollo } from "apollo-angular";
import { Store } from "@ngrx/store";
import * as fromQuestionary from "../questionary/store/reducers";
import { TreeItem, data, UserPartialModelItem } from "./mock";
import { of } from "rxjs";

@Component({
  selector: "app-maturity-model",
  templateUrl: "./maturity-model.component.html",
  styleUrls: ["./maturity-model.component.scss"]
})
export class MaturityModelComponent implements OnInit {
  maturityModel_id: string;
  userMaturityModelSpiderChart$: Observable<UserMaturityModel>;
  maturityModel$: Observable<MaturityModel>;

  userMaturityModelOfUserData: UserMaturityModel;
  adjustMaturityModelForm: FormGroup;
  adjustMaturityModelFormControl = new FormControl();
  dataItems: TreeItem = data;
  testSubject$: Subject<UserMaturityModel>;

  constructor(
    private route: ActivatedRoute,
    private userMaturityModelOfUserGQL: UserMaturityModelOfUserGQL,
    private maturityModelGQL: MaturityModelGQL,
    private apollo: Apollo,
    private store$: Store<fromQuestionary.State>,
    private formBuilder: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.maturityModel_id = this.route.snapshot.paramMap.get(
      "maturitymodel_id"
    );
    this.userMaturityModelSpiderChart$ = this.userMaturityModelOfUserGQL
      .watch({ userMaturityModelId: this.maturityModel_id })
      .valueChanges.pipe(
        map(
          (result) => result.data.userMaturityModelOfUser as UserMaturityModel
        )
      );

    this.userMaturityModelOfUserGQL
      .watch({ userMaturityModelId: this.maturityModel_id })
      .valueChanges.pipe(
        map(
          (result) => result.data.userMaturityModelOfUser as UserMaturityModel
        )
      )
      .subscribe((res) => {
        this.userMaturityModelOfUserData = JSON.parse(JSON.stringify(res));
        this.testSubject$ = new BehaviorSubject(
          this.userMaturityModelOfUserData
        );
      });

    this.maturityModel$ = this.maturityModelGQL
      .watch({ maturityModelId: ID_OF_MATURITYMODEL })
      .valueChanges.pipe(
        map((result) => result.data.maturityModel as MaturityModel)
      );
  }

  onUserPartialModelChange(event: UserPartialModel, id: string) {
    this.userMaturityModelOfUserData.userPartialModels = this.userMaturityModelOfUserData.userPartialModels.map(
      (a) => {
        if (a.id === id) {
          return event;
        }
        return a;
      }
    );
    this.testSubject$.next(this.userMaturityModelOfUserData);
  }

  onSubmit() {
    console.log(this.adjustMaturityModelForm.value);
  }

  showConsole(item: any) {
    console.log(item);
  }

  // needed since we dont know the dimension of userMaturityModel: how many levels of subUserPartialModels do we have?
  // -> with this function we limit the dimension to 1 level of userPartialModels and 1 level of subUserPartialModels
  transformGraphQlInputUserMaturityModelToSpiderChartDataContract(
    userMaturityModel: UserMaturityModel
  ): InputMaturityModelSpiderChart {
    const tmp: InputMaturityModelSpiderChart = {
      nameMaturityModel: userMaturityModel.name,
      userPartialModels: userMaturityModel.userPartialModels.map((a) => {
        return {
          // will be determined after this first iteration
          maturityLevelEvaluationMetrics: 0,
          maxMaturityLevelEvaluationMetrics: 0,

          partialModel: a.partialModel,
          subUserPartialModel: a.subUserPartialModels.map((b) => {
            return {
              maturityLevelEvaluationMetrics:
                b.userEvaluationMetrics.reduce(
                  (c: number, d: UserEvaluationMetric) =>
                    c + d.valueEvaluationMetric,
                  0
                ) / b.userEvaluationMetrics.length,
              // took simply the first one ([0]) since one must exist at least (like at least: "Aussage trifft zu" with 5 levels (0-4) (but not 5 evaluationMetrics but one))
              maxMaturityLevelEvaluationMetrics:
                b.userEvaluationMetrics[0].evaluationMetric.maxValue,
              minMaturityLevelEvaluationMetrics:
                b.userEvaluationMetrics[0].evaluationMetric.minValue,
              partialModel: b.partialModel,
              parentUserPartialModel: a
            } as InputSubUserPartialModelSpiderChart;
          })
        } as InputUserPartialModelSpiderChart;
      })
    };
    tmp.userPartialModels.map((a) => {
      a.maxMaturityLevelEvaluationMetrics =
        a.subUserPartialModel[0].maxMaturityLevelEvaluationMetrics;
      a.maturityLevelEvaluationMetrics =
        a.subUserPartialModel.reduce(
          (b, c) => b + c.maturityLevelEvaluationMetrics,
          0
        ) / a.subUserPartialModel.length;
      return a;
    });
    return tmp;
  }
}
